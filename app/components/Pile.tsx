"use client";

import Matter from "matter-js";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { groupAnswer, type Answered, type Grouped, type Tier } from "@/lib/tiers";

export type Face = { id: string; name: string; role: string; img: string };

// No accusation-style examples here: we shouldn't invite the questions that
// need the 90% bar.
const EXAMPLES = [
  "Who's the funniest?",
  "Best president ever",
  "Who would win a fistfight?",
  "Who has the best hair?",
];
// After the first answer, the chips rotate through these too.
const MORE = [
  "Who's the richest?",
  "Who'd survive a zombie apocalypse?",
  "Who's the best dancer?",
  "Who's the smartest?",
  "Who's from Texas?",
  "Who has the most charisma?",
  "Who'd be the best roommate?",
];
const POOL = [...EXAMPLES, ...MORE];

type Pos = { x: number; y: number; a: number; s: number };

const LOST = "Jev got lost in the pile.";
const HOME_TITLE = "Jev! Politicians by Jev";
type Status = "idle" | "asking" | "done" | "blocked" | "error";

// Faces render at the largest size they'll ever show and scale down,
// so the winner's portrait stays sharp when it grows.
const BASE = 96;

// While Jev thinks, the pile churns for at least this long so the moment reads.
const MIN_DIG_MS = 650;
// After the answer, low scorers sink and high scorers bubble up for this long.
const SORT_MS = 1800;

// Size faces so the settled pile fills about a quarter of the screen,
// but never so small on a phone that they stop reading as people.
function radiusFor(width: number, height: number) {
  const r = Math.sqrt((width * height * 0.26) / (100 * 3.6));
  return Math.round(Math.min(32, Math.max(19, r)));
}

// Slot size for a lifted face, and whether its name sits under it.
function slotSize(key: Tier["key"], count: number, total: number, narrow: boolean) {
  if (key === "pick") return count > 1 ? (narrow ? 64 : 80) : narrow ? 84 : 96;
  if (key === "close") return narrow ? 44 : 52;
  if (key === "bottom") return 40;
  if (total > 12) return narrow ? 32 : 40;
  if (total > 6) return narrow ? 44 : 52;
  return narrow ? 56 : 64;
}

const pct = (v: number | undefined) => {
  const n = Math.round((v ?? 0) * 100);
  return n < 1 ? "<1%" : `${n}%`;
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setRm(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return rm;
}

export default function Pile({ faces }: { faces: Face[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const faceEls = useRef(new Map<string, HTMLDivElement>());
  const slotEls = useRef(new Map<string, HTMLDivElement>());
  const bodies = useRef(new Map<string, Matter.Body>());
  const pos = useRef(new Map<string, Pos>());
  const lifted = useRef(new Set<string>());
  // Where a lifted face sat in the pile, so reduced motion can put it back.
  const home = useRef(new Map<string, { x: number; y: number }>());
  // The face being dragged, where the pointer is, and how fast it's moving.
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    t: number;
    moved: number;
  } | null>(null);
  const engine = useRef<Matter.Engine | null>(null);
  // The waiting and answering moments, read by the physics loop.
  const digging = useRef(false);
  const ripple = useRef<{ t: number; kicked: Set<string> } | null>(null);
  const weight = useRef<Record<string, number>>({});
  const sortUntil = useRef(0);
  const rmRef = useRef(false);
  // Set once most of the pile has come to rest after the first drop.
  const landed = useRef(false);

  const [r, setR] = useState(0);
  const [narrow, setNarrow] = useState(false);
  const rm = useReducedMotion();

  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [asks, setAsks] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [answer, setAnswer] = useState<Answered | null>(null);
  const [blockedWhy, setBlockedWhy] = useState<"abuse" | "private">("private");
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [focusId, setFocusId] = useState(faces[0]?.id);
  const [copied, setCopied] = useState(false);
  const [nativeShare, setNativeShare] = useState(false);

  const byId = useMemo(() => new Map(faces.map((f) => [f.id, f])), [faces]);
  const grouped: Grouped | null = useMemo(() => (answer ? groupAnswer(answer) : null), [answer]);
  const tiers = useMemo(() => grouped?.tiers ?? [], [grouped]);

  useEffect(() => {
    rmRef.current = rm;
  }, [rm]);

  // Face size is fixed per session, picked from the screen width.
  useLayoutEffect(() => {
    const el = stage.current!;
    setR(radiusFor(el.clientWidth, el.clientHeight));
    setNarrow(el.clientWidth < 640);
    setNativeShare(typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Physics: one engine, walls on three sides, faces dropped in from above.
  useEffect(() => {
    const el = stage.current!;
    if (!r) return;
    const all = bodies.current;
    const e = Matter.Engine.create({ gravity: { x: 0, y: 1 }, enableSleeping: true });
    engine.current = e;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Oversized walls so a resize only needs a reposition.
    const opts = { isStatic: true };
    const floor = Matter.Bodies.rectangle(0, 0, 20000, 100, opts);
    const left = Matter.Bodies.rectangle(0, 0, 100, 20000, opts);
    const right = Matter.Bodies.rectangle(0, 0, 100, 20000, opts);
    const h = el.clientHeight;
    const placeWalls = () => {
      const w = el.clientWidth;
      Matter.Body.setPosition(floor, { x: w / 2, y: h + 50 });
      Matter.Body.setPosition(left, { x: -50, y: h - 10000 });
      Matter.Body.setPosition(right, { x: w + 50, y: h - 10000 });
    };
    placeWalls();
    Matter.Composite.add(e.world, [floor, left, right]);

    const w = el.clientWidth;
    faces.forEach((f) => {
      const b = Matter.Bodies.circle(
        r + Math.random() * (w - 2 * r),
        h * 0.55 - r - Math.random() * h,
        r,
        { restitution: 0, friction: 0.8, frictionAir: 0.02, density: 0.002, sleepThreshold: 30 },
      );
      bodies.current.set(f.id, b);
    });
    Matter.Composite.add(e.world, [...bodies.current.values()]);

    // Fixed physics step. Matter's integrator jitters when the step size
    // changes frame to frame (e.g. 120Hz phones), so bank time and step
    // exactly 1/60s at a time.
    const STEP = 1000 / 60;

    // With reduced motion the pile is already settled on first paint.
    // Otherwise skip the first moments of the fall so the screen isn't empty.
    const ahead = still ? 900 : 30;
    for (let i = 0; i < ahead; i++) {
      Matter.Engine.update(e, STEP);
      if (still && [...all.values()].every((b) => b.isSleeping)) break;
    }
    for (const [id, b] of all) pos.current.set(id, { x: b.position.x, y: b.position.y, a: b.angle, s: (2 * r) / BASE });

    const pileBodies = () => [...all].filter(([id]) => !lifted.current.has(id));
    // Only faces at rest get kicked, so nothing mid-fall reverses.
    const kick = (b: Matter.Body, vy: number, vx = 0) => {
      if (Math.abs(b.velocity.y) > 1.5) return;
      Matter.Sleeping.set(b, false);
      Matter.Body.setVelocity(b, { x: b.velocity.x + vx, y: Math.min(b.velocity.y, 0) + vy });
      Matter.Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.08);
    };

    // One physics step of the moment: rummaging while Jev thinks, then the
    // pile sorting itself, heavy (unlikely) faces down, light (likely) ones up.
    const moment = (now: number) => {
      const rip = ripple.current;
      if (rip) {
        // A wave runs out from the middle as the question lands in the pile.
        const cx = el.clientWidth / 2;
        for (const [id, b] of pileBodies()) {
          if (rip.kicked.has(id)) continue;
          if (now - rip.t < (Math.abs(b.position.x - cx) / cx) * 260) continue;
          rip.kicked.add(id);
          kick(b, -(5 + Math.random() * 3));
        }
        if (rip.kicked.size >= all.size - lifted.current.size) ripple.current = null;
      }
      if (digging.current) {
        for (const [, b] of pileBodies()) {
          if (Math.random() < 0.012) kick(b, -(3.5 + Math.random() * 5), (Math.random() - 0.5) * 2);
        }
      }
      if (sortUntil.current > now) {
        const wts = weight.current;
        for (const [id, b] of pileBodies()) {
          const wt = wts[id] ?? 0;
          // Extra pull for unlikely faces, a little lift for likely ones.
          Matter.Sleeping.set(b, false);
          Matter.Body.setVelocity(b, { x: b.velocity.x, y: b.velocity.y + (0.45 - wt) * 0.3 });
          if (Math.random() < 0.08 * wt * wt) kick(b, -(3 + wt * 7), (Math.random() - 0.5) * 1.5);
        }
      }
    };

    let raf = 0;
    let last = performance.now();
    let bank = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      bank += dt;
      while (bank >= STEP) {
        const d = drag.current;
        if (d) {
          // Pull the held face toward the pointer by velocity, so it still
          // shoves the faces it runs into.
          const b = bodies.current.get(d.id)!;
          Matter.Body.setVelocity(b, {
            x: (d.x - b.position.x) * 0.35,
            y: (d.y - b.position.y) * 0.35,
          });
        }
        if (!rmRef.current) moment(now);
        Matter.Engine.update(e, STEP);
        bank -= STEP;
      }
      const snap = rmRef.current;
      const k = snap ? 1 : 1 - Math.pow(1 - 0.16, dt / 16.7);
      const kPile = snap ? 1 : 1 - Math.pow(1 - 0.2, dt / 16.7);
      const box = el.getBoundingClientRect();
      for (const f of faces) {
        const p = pos.current.get(f.id)!;
        const node = faceEls.current.get(f.id);
        if (lifted.current.has(f.id)) {
          const slot = slotEls.current.get(f.id);
          if (slot) {
            const s = slot.getBoundingClientRect();
            const tx = s.left - box.left + s.width / 2;
            const ty = s.top - box.top + s.width / 2;
            p.x += (tx - p.x) * k;
            p.y += (ty - p.y) * k;
            p.a += (0 - p.a) * k;
            p.s += (s.width / BASE - p.s) * k;
          }
        } else {
          const b = bodies.current.get(f.id)!;
          p.x = b.position.x;
          p.y = b.position.y;
          p.a = b.angle;
          p.s += ((2 * r) / BASE - p.s) * kPile;
        }
        if (node) {
          node.style.transform = `translate(${p.x - BASE / 2}px, ${p.y - BASE / 2}px) rotate(${p.a}rad) scale(${p.s})`;
          // Picked faces sit above the results; the pile sits behind them.
          node.style.zIndex = lifted.current.has(f.id) ? "35" : "10";
        }
      }
      if (!landed.current) {
        let resting = 0;
        // Faces start at rest above the screen, so only count ones that fell in.
        for (const b of all.values()) if (b.position.y > 0 && (b.isSleeping || b.speed < 0.3)) resting++;
        landed.current = resting >= all.size * 0.9;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Only a width change moves the walls. Height changes on phones come from
    // the keyboard or the address bar, and shouldn't make the pile jump.
    let lastWidth = el.clientWidth;
    const onResize = () => {
      if (Math.abs(el.clientWidth - lastWidth) < 40) return;
      lastWidth = el.clientWidth;
      placeWalls();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      Matter.Engine.clear(e);
      all.clear();
    };
  }, [faces, r]);

  // Move faces between the pile and the result slots whenever tiers change,
  // and grey out the ones Jev doesn't think fit.
  useLayoutEffect(() => {
    const e = engine.current;
    if (!e) return;
    const next = new Set(tiers.flatMap((t) => t.ids));
    const snap = rmRef.current;
    const fadeIn = (id: string) => {
      const node = faceEls.current.get(id);
      if (!node || !snap) return;
      node.style.opacity = "0";
      requestAnimationFrame(() => requestAnimationFrame(() => (node.style.opacity = "")));
    };
    for (const id of lifted.current) {
      if (next.has(id)) continue;
      const b = bodies.current.get(id)!;
      const p = pos.current.get(id)!;
      const back = snap ? (home.current.get(id) ?? p) : p;
      Matter.Body.setPosition(b, { x: back.x, y: back.y });
      Matter.Body.setVelocity(b, { x: 0, y: 0 });
      Matter.Sleeping.set(b, false);
      Matter.Composite.add(e.world, b);
      if (snap) {
        p.x = back.x;
        p.y = back.y;
        fadeIn(id);
      }
    }
    for (const id of next) {
      if (lifted.current.has(id)) continue;
      const b = bodies.current.get(id)!;
      home.current.set(id, { x: b.position.x, y: b.position.y });
      Matter.Composite.remove(e.world, b);
      fadeIn(id);
    }
    lifted.current = next;

    const wts = grouped?.weight ?? {};
    const vals = Object.values(wts).sort((a, b) => a - b);
    // Only the top 30% stay in color, so what sank is obvious.
    const cut = Math.max(0.2, vals[Math.floor(vals.length * 0.7)] ?? 0);
    for (const f of faces) {
      const node = faceEls.current.get(f.id);
      if (!node) continue;
      const dim = vals.length > 0 && !next.has(f.id) && (wts[f.id] ?? 0) < cut;
      node.toggleAttribute("data-dim", dim);
    }
  }, [tiers, grouped, faces]);

  // Tapping a face in the pile makes it hop. That's the only bounce there is.
  const hop = useCallback((id: string) => {
    if (lifted.current.has(id)) return;
    const b = bodies.current.get(id);
    if (!b) return;
    Matter.Sleeping.set(b, false);
    Matter.Body.setVelocity(b, { x: (Math.random() - 0.5) * 3, y: -8 });
    Matter.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.2);
  }, []);

  // Grab a face: drag it around, fling it on release, or tap it to hop.
  const local = (e: React.PointerEvent) => {
    const box = stage.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };

  const grab = useCallback((e: React.PointerEvent<HTMLDivElement>, id: string) => {
    setHover(id);
    if (lifted.current.has(id)) return;
    const b = bodies.current.get(id);
    if (!b) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    Matter.Sleeping.set(b, false);
    const { x, y } = local(e);
    drag.current = { id, x, y, vx: 0, vy: 0, t: performance.now(), moved: 0 };
  }, []);

  const moveDrag = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const { x, y } = local(e);
    const now = performance.now();
    const dt = Math.max(now - d.t, 1);
    // Smoothed pointer speed in px per physics step, used for the throw.
    d.vx = d.vx * 0.5 + ((x - d.x) / dt) * (1000 / 60) * 0.5;
    d.vy = d.vy * 0.5 + ((y - d.y) / dt) * (1000 / 60) * 0.5;
    d.moved += Math.hypot(x - d.x, y - d.y);
    d.x = x;
    d.y = y;
    d.t = now;
  }, []);

  const release = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.moved < 6) {
      hop(d.id);
      return;
    }
    const b = bodies.current.get(d.id)!;
    const clamp = (v: number) => Math.max(-28, Math.min(28, v));
    Matter.Body.setVelocity(b, { x: clamp(d.vx), y: clamp(d.vy) });
  }, [hop]);

  // Keyboard: the pile is one tab stop. Arrow keys move to the nearest face
  // in that direction; Enter or Space makes it hop.
  const keyNav = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        hop(id);
        return;
      }
      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const d = dirs[e.key];
      if (!d) return;
      e.preventDefault();
      const from = pos.current.get(id)!;
      let best: string | null = null;
      let bestCost = Infinity;
      for (const f of faces) {
        if (f.id === id) continue;
        const p = pos.current.get(f.id)!;
        const dx = p.x - from.x;
        const dy = p.y - from.y;
        const along = dx * d[0] + dy * d[1];
        if (along <= 4) continue;
        const cost = along + Math.abs(dx * d[1] - dy * d[0]) * 2;
        if (cost < bestCost) {
          bestCost = cost;
          best = f.id;
        }
      }
      if (best) {
        setFocusId(best);
        faceEls.current.get(best)?.focus({ preventScroll: true });
      }
    },
    [faces, hop],
  );

  // Desktop: sweeping the mouse through the pile pushes faces aside.
  const lastMouse = useRef<{ x: number; y: number } | null>(null);
  const nudge = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || drag.current || rmRef.current) return;
    const { x, y } = local(e);
    const prev = lastMouse.current;
    lastMouse.current = { x, y };
    if (!prev) return;
    const mx = x - prev.x;
    const my = y - prev.y;
    const speed = Math.hypot(mx, my);
    if (speed < 2) return;
    const reach = r * 1.6;
    for (const [id, b] of bodies.current) {
      if (lifted.current.has(id)) continue;
      const dx = b.position.x - x;
      const dy = b.position.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach) continue;
      const push = Math.min(speed, 30) * 0.12 * (1 - dist / reach);
      Matter.Sleeping.set(b, false);
      Matter.Body.setVelocity(b, {
        x: b.velocity.x + (mx / speed) * push + (dx / (dist || 1)) * push * 0.5,
        y: b.velocity.y + (my / speed) * push + (dy / (dist || 1)) * push * 0.5 - push * 0.3,
      });
    }
  }, [r]);

  const reqId = useRef(0);
  const ask = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const id = ++reqId.current;
    setQuestion(trimmed);
    setAsked(trimmed);
    setAsks((n) => n + 1);
    setHistory((h) => (h.includes(trimmed) ? h : [...h, trimmed]));
    setStatus("asking");
    setError("");
    setCopied(false);
    setAnswer(null);
    weight.current = {};
    sortUntil.current = 0;
    const start = performance.now();
    if (!rmRef.current) {
      digging.current = true;
      ripple.current = { t: start, kicked: new Set() };
    }
    const url = new URL(window.location.href);
    url.searchParams.set("q", trimmed);
    window.history.replaceState(null, "", url);
    document.title = `“${trimmed}” · Jev!`;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? LOST);
      const wait = rmRef.current ? 0 : MIN_DIG_MS - (performance.now() - start);
      if (wait > 0) await new Promise((ok) => setTimeout(ok, wait));
      if (id !== reqId.current) return;
      digging.current = false;
      if ("blocked" in data) {
        setBlockedWhy(data.blocked === "abuse" ? "abuse" : "private");
        setStatus("blocked");
        return;
      }
      const a = data as Answered;
      weight.current = groupAnswer(a).weight;
      sortUntil.current = performance.now() + SORT_MS;
      setAnswer(a);
      setStatus("done");
    } catch (err) {
      if (id !== reqId.current) return;
      digging.current = false;
      // Only our own messages reach the screen; network and parse errors don't.
      setError(err instanceof Error && err.message.startsWith("Slow down") ? err.message : LOST);
      setStatus("error");
    }
  }, []);

  const inputEl = useRef<HTMLInputElement>(null);
  const mainEl = useRef<HTMLElement>(null);
  const clear = useCallback(() => {
    reqId.current++;
    digging.current = false;
    weight.current = {};
    setQuestion("");
    setAsked("");
    setAnswer(null);
    setError("");
    setStatus("idle");
    window.history.replaceState(null, "", window.location.pathname);
    document.title = HOME_TITLE;
    // On phones, focusing would pop the keyboard over the pile.
    if (window.matchMedia("(pointer: fine)").matches) inputEl.current?.focus();
  }, []);

  // Escape starts over from anywhere, not just the input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "idle") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, clear]);

  // Shared links (?q=...) ask on load, once the pile has landed.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    const start = performance.now();
    const t = setInterval(() => {
      if (!landed.current && performance.now() - start < 3000) return;
      clearInterval(t);
      ask(q);
    }, 100);
    return () => clearInterval(t);
  }, [ask]);

  const shareUrl = () => {
    const url = new URL(window.location.origin);
    url.searchParams.set("q", asked);
    return url.toString();
  };
  const imageUrl = () => `/og?q=${encodeURIComponent(asked)}`;

  const share = useCallback(async () => {
    const url = shareUrl();
    if (nativeShare) {
      const top = tiers[0]?.ids[0];
      const text = top ? `“${asked}” Jev says ${byId.get(top)?.name}.` : `“${asked}” Ask Jev.`;
      try {
        await navigator.share({ title: "Jev!", text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link", url);
    }
    // shareUrl reads `asked`, which is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked, byId, nativeShare, tiers]);

  const saveImage = useCallback(async () => {
    const res = await fetch(imageUrl());
    const blob = await res.blob();
    const slug = asked.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "answer";
    const file = new File([blob], `jev-${slug}.png`, { type: "image/png" });
    if (nativeShare && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked, nativeShare]);

  const shown = grouped?.shown ?? {};
  const total = tiers.reduce((n, t) => n + t.ids.length, 0);
  const hovered = hover ? byId.get(hover) : null;
  const strict = answer?.mode === "strict";
  const settled = status !== "idle";
  const fresh = POOL.filter((q) => !history.includes(q));
  const chips = settled ? fresh.slice((asks * 4) % Math.max(1, fresh.length)).concat(fresh).slice(0, 4) : EXAMPLES;

  // One sentence for screen readers, since the faces themselves are pictures.
  const summary = tiers
    .map((t) => `${t.label}: ${t.ids.map((id) => `${byId.get(id)?.name}${t.key === "bottom" ? "" : ` ${pct(shown[id])}`}`).join(", ")}`)
    .join(". ");

  const slot = (id: string, size: number) => (
    <div
      ref={(n) => {
        if (n) slotEls.current.set(id, n);
        else slotEls.current.delete(id);
      }}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );

  const renderTier = (t: Tier) => {
    const many = t.key === "sure" || t.key === "likely" || t.key === "guess";
    const size = slotSize(t.key, t.ids.length, total, narrow);
    const showNames = !(many && total > 12);

    if (t.key === "pick" && t.ids.length === 1) {
      const f = byId.get(t.ids[0])!;
      return (
        <section key={t.key} className="flex flex-col items-center text-center">
          {slot(f.id, size)}
          <h2 className="mt-3 text-xl font-semibold leading-tight tracking-tight text-balance text-ink sm:text-2xl">{f.name}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {t.label} · <span className="font-semibold tabular-nums text-jev">{pct(shown[f.id])}</span> of Jev&apos;s vote
          </p>
        </section>
      );
    }

    if (t.key === "bottom") {
      const f = byId.get(t.ids[0])!;
      return (
        <section key={t.key} className="flex w-full items-center justify-center gap-3 border-t border-line pt-3">
          {slot(f.id, size)}
          <div className="text-left leading-tight">
            <p className="text-xs text-ink-soft">{t.label}</p>
            <p className="text-sm font-medium text-ink">{f.name}</p>
          </div>
        </section>
      );
    }

    return (
      <section key={t.key} className="flex w-full flex-col items-center">
        <h2 className="mb-2 text-[13px] font-medium text-ink-soft">
          {t.label}
          {many && <span className="ml-1.5 tabular-nums text-ink-faint">{t.total}</span>}
        </h2>
        <ul className="flex flex-wrap justify-center gap-x-2 gap-y-2">
          {t.ids.map((id) => {
            const f = byId.get(id)!;
            return (
              <li
                key={id}
                className="flex flex-col items-center"
                style={{ width: showNames ? Math.max(size, t.key === "pick" ? 96 : 72) : size }}
              >
                {slot(id, size)}
                {showNames ? (
                  <>
                    <span className="mt-1 text-center text-xs font-medium leading-tight text-balance text-ink">{f.name}</span>
                    <span className="text-[11px] tabular-nums text-ink-faint">{pct(shown[id])}</span>
                  </>
                ) : (
                  <span className="sr-only">{f.name}</span>
                )}
              </li>
            );
          })}
        </ul>
        {!showNames && (
          <p className="mt-2 max-w-md text-center text-xs leading-relaxed text-pretty text-ink-soft">
            {t.ids.map((id) => byId.get(id)?.name).join(", ")}
            {t.total > t.ids.length ? `, and ${t.total - t.ids.length} more` : ""}
          </p>
        )}
      </section>
    );
  };

  return (
    <div
      ref={stage}
      onPointerMove={nudge}
      onWheel={(e) => {
        // The column passes clicks through to the pile, so wheel over the
        // pile scrolls it by hand.
        const m = mainEl.current;
        if (m && !m.contains(e.target as Node)) m.scrollTop += e.deltaY;
      }}
      className="relative h-svh w-full overflow-clip select-none"
    >
      <main ref={mainEl} className="no-scrollbar pointer-events-none absolute inset-0 z-20 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-6 pb-40 sm:pt-12">
          <h1
            className={`font-logo leading-none tracking-tight text-jev transition-[font-size] duration-300 ease-(--ease-out) ${settled ? "text-[3.75rem] sm:text-[5rem]" : "text-[5.5rem] sm:text-[8rem]"}`}
          >
            Jev!
          </h1>
          <p className={`mt-2 text-center text-sm text-ink-soft sm:text-base ${settled ? "hidden" : ""}`}>
            America&apos;s 100 most famous politicians.<br className="sm:hidden" /> You ask. An AI picks.
          </p>

          <form
            className="pointer-events-auto mt-5 w-full max-w-xl sm:mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <div className="relative">
              <input
                ref={inputEl}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") clear();
                }}
                maxLength={140}
                enterKeyHint="go"
                placeholder="Ask about any of them"
                aria-label="Ask Jev about politicians"
                className="h-14 w-full rounded-2xl border border-ink/15 bg-white pr-[6.25rem] pl-5 text-base shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-ink-faint focus:border-jev/70 focus:shadow-[0_0_0_4px_rgba(225,38,28,0.14)] focus-visible:outline-none sm:h-16 sm:text-lg"
              />
              <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
                {(question || status !== "idle") && (
                  <button
                    type="button"
                    onClick={clear}
                    aria-label="Clear and start over"
                    title="Clear (Esc)"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-line/70 hover:text-ink"
                  >
                    <Icon d="M5 5l10 10M15 5L5 15" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Ask Jev"
                  disabled={!question.trim() || status === "asking"}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-jev text-white transition-[background-color,transform,opacity] duration-150 hover:bg-jev-deep active:scale-[0.94] disabled:bg-ink/10 disabled:text-ink-faint"
                >
                  <Icon d="M10 16V4M4.5 9.5L10 4l5.5 5.5" />
                </button>
              </div>
            </div>
          </form>

          <div
            className={`mt-4 w-full max-w-xl rounded-3xl transition-[background-color,box-shadow] duration-300 sm:mt-6 ${status === "done" ? "pointer-events-auto bg-white/90 px-4 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-md sm:px-6" : ""}`}
          >
            <p className="sr-only" aria-live="polite">
              {status === "asking" && "Jev is thinking."}
              {status === "done" && (summary || "Jev didn't name anyone.")}
              {status === "blocked" && "Jev won't answer that one."}
              {status === "error" && error}
            </p>
            {status === "asking" && (
              <p className="text-center text-ink-soft" aria-hidden="true">
                Jev is digging through the pile…
              </p>
            )}
            {status === "error" && (
              <div className="pointer-events-auto flex flex-col items-center gap-3">
                <p className="text-center text-ink">{error}</p>
                <button
                  type="button"
                  onClick={() => ask(asked)}
                  className="inline-flex min-h-11 items-center rounded-full border border-ink/15 bg-white px-5 font-medium text-ink transition-[border-color,transform] duration-150 hover:border-ink/40 active:scale-[0.97]"
                >
                  Try again
                </button>
              </div>
            )}
            {status === "blocked" && (
              <p className="mx-auto max-w-md text-center text-pretty text-ink-soft">
                <span className="font-semibold text-ink">Jev won&apos;t touch that one.</span>{" "}
                {blockedWhy === "abuse"
                  ? "It doesn't guess about abuse. Ask it something else."
                  : "It doesn't guess about people's private lives. Ask it something else."}
              </p>
            )}
            {status === "done" && (
              <div className="flex flex-col items-center gap-5" aria-hidden="true">
                {total === 0 && (
                  <p className="max-w-md text-center text-pretty text-ink-soft">
                    {strict ? (
                      <>
                        <span className="font-semibold text-ink">Jev isn&apos;t sure enough to name anyone.</span> For
                        accusations, it only answers when it&apos;s 90% sure.
                      </>
                    ) : (
                      <>
                        Jev says: <span className="font-semibold text-ink">nobody.</span>
                      </>
                    )}
                  </p>
                )}
                {tiers.map(renderTier)}
              </div>
            )}
            {status === "done" && total === 0 && (
              <p className="mt-2 text-center text-sm text-ink-faint">Try asking it another way.</p>
            )}
            {status === "done" && total > 0 && (
              <div className="mt-5 flex flex-col items-center gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={share}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-jev px-5 font-medium text-white transition-[background-color,transform] duration-150 hover:bg-jev-deep active:scale-[0.97]"
                  >
                    {copied ? (
                      <Icon d="M4.5 10.5l3.5 3.5 7.5-8" />
                    ) : nativeShare ? (
                      <Icon d="M10 3v10M6 7l4-4 4 4M4 11v5h12v-5" />
                    ) : (
                      <Icon d="M8.5 11.5a3.5 3.5 0 005 0l2.5-2.5a3.5 3.5 0 00-5-5l-1 1M11.5 8.5a3.5 3.5 0 00-5 0L4 11a3.5 3.5 0 005 5l1-1" />
                    )}
                    <span aria-live="polite">{copied ? "Link copied" : nativeShare ? "Share" : "Copy link"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={saveImage}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 bg-white px-5 font-medium text-ink transition-[border-color,transform] duration-150 hover:border-ink/40 active:scale-[0.97]"
                  >
                    <Icon d="M10 3v9M6 8.5l4 4 4-4M4 16h12" />
                    Save image
                  </button>
                </div>
                <p className="text-center text-xs text-ink-faint">
                  Jev’s opinion, not fact. Mad about it? <span className="font-semibold text-jev">Blame Jev.</span>
                </p>
              </div>
            )}
          </div>

          {status !== "asking" && (
            <nav
              aria-label={settled ? "Ask another" : "Try asking"}
              className={`pointer-events-auto mt-4 w-full max-w-2xl ${settled ? "sm:mt-5" : ""}`}
            >
              <ul
                className={`no-scrollbar flex gap-2 ${settled ? "-mx-4 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0" : "flex-wrap justify-center"}`}
              >
                {chips.map((q) => (
                  <li key={q} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => ask(q)}
                      className="min-h-11 rounded-full border border-line bg-white/90 px-4 text-sm text-ink-soft backdrop-blur transition-[border-color,color,transform] duration-150 hover:border-ink/30 hover:text-ink active:scale-[0.97]"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </main>

      <a
        href="/credits"
        className="absolute right-2 bottom-2 z-40 inline-flex min-h-11 items-center rounded-full bg-white/85 px-3 text-xs text-ink-soft backdrop-blur hover:text-ink"
      >
        Photo credits
      </a>

      {/* Faces share one layer; the physics loop writes their transforms and z-order. */}
      <div
        className="pointer-events-none absolute inset-0"
        role="group"
        aria-label="The pile of 100 politicians. Arrow keys move between faces."
      >
        {r > 0 &&
          faces.map((f) => (
            <div
              key={f.id}
              ref={(n) => {
                if (n) faceEls.current.set(f.id, n);
                else faceEls.current.delete(f.id);
              }}
              role="button"
              tabIndex={f.id === focusId ? 0 : -1}
              aria-label={`${f.name}, ${f.role}${shown[f.id] !== undefined ? `, ${pct(shown[f.id])}` : ""}`}
              onFocus={() => {
                setFocusId(f.id);
                setHover(f.id);
              }}
              onBlur={() => setHover((h) => (h === f.id ? null : h))}
              onKeyDown={(e) => keyNav(e, f.id)}
              onPointerEnter={() => setHover(f.id)}
              onPointerDown={(e) => grab(e, f.id)}
              onPointerMove={moveDrag}
              onPointerUp={release}
              onPointerCancel={release}
              onPointerLeave={(e) => {
                // Touch fires leave right after lifting the finger; keep the name up a moment.
                const later = e.pointerType === "touch" ? 1800 : 0;
                setTimeout(() => setHover((h) => (h === f.id ? null : h)), later);
              }}
              className="face pointer-events-auto absolute top-0 left-0 cursor-grab touch-none overflow-hidden rounded-full bg-line shadow-[0_2px_6px_rgba(0,0,0,0.25)] ring-[3px] ring-white will-change-transform active:cursor-grabbing"
              style={{ width: BASE, height: BASE, transform: "translate(-200px, -200px)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.img}
                alt=""
                draggable={false}
                loading="eager"
                className="h-full w-full object-cover"
                style={{ objectPosition: "50% 22%" }}
              />
            </div>
          ))}
      </div>

      {hovered && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 max-w-[calc(100vw-2rem)] -translate-x-1/2 truncate rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
          <span className="font-semibold">{hovered.name}</span>
          <span className="text-white/70"> · {hovered.role}</span>
          {shown[hovered.id] !== undefined || answer?.mode === "normal" ? (
            <span className="tabular-nums text-white/70">
              {" "}
              · {pct(shown[hovered.id])}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
