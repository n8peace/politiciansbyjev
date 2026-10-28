"use client";

import Matter from "matter-js";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Share from "@/app/components/Share";
import { LIKELY, pct, verdictFor, type Mode, type Verdict } from "@/lib/verdict";

export type Face = { id: string; name: string; role: string; img: string; big: string };

const EXAMPLES = [
  "Best president ever",
  "Who’s the most corrupt?",
  "Who would win a fistfight?",
  "Who’s the richest?",
  "Who has the best hair?",
  "Who’s the funniest?",
  "Who would survive a zombie apocalypse?",
  "Who gives the best speeches?",
];

type Pos = { x: number; y: number; a: number; s: number };
type Status = "idle" | "asking" | "done" | "blocked" | "error";

// Size faces so the settled pile fills about a quarter of the screen.
function radiusFor(width: number, height: number) {
  const r = Math.sqrt((width * height * 0.26) / (100 * 3.6));
  return Math.round(Math.min(32, Math.max(14, r)));
}

// Sizes for faces that float out of the pile. The top pick is the hero; the
// rest shrink as the crowd grows. Names show for the first few, and every
// face can be tapped or focused for its name.
function sizes(narrow: boolean, others: number) {
  return {
    hero: narrow ? 96 : 136,
    named: narrow ? 3 : 7, // one full row of names
    // Past this many, the rest of the picks stay in the pile in full color.
    shown: narrow ? 3 : 28,
    other: others > 24 ? (narrow ? 32 : 36) : others > 8 ? (narrow ? 38 : 44) : narrow ? 52 : 60,
  };
}

type Hover = { id: string; x: number; y: number; below: boolean };
// Where a name tag goes: centered over the face, kept on screen.
const anchor = (id: string, el: Element): Hover => {
  const b = el.getBoundingClientRect();
  const half = Math.min(160, (window.innerWidth - 32) / 2);
  const x = Math.min(Math.max(b.left + b.width / 2, 16 + half), window.innerWidth - 16 - half);
  const below = b.top < 72;
  return { id, x, y: below ? b.bottom + 8 : b.top - 8, below };
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Pile({ faces, initialQuestion = "" }: { faces: Face[]; initialQuestion?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const faceEls = useRef(new Map<string, HTMLDivElement>());
  const slotEls = useRef(new Map<string, HTMLDivElement>());
  const bodies = useRef(new Map<string, Matter.Body>());
  const pos = useRef(new Map<string, Pos>());
  // Faces headed out of the pile, and when each one leaves (best first).
  const lifted = useRef(new Map<string, number>());
  const launched = useRef(new Set<string>());
  // How much each pile face has "sunk" (0 = full color, 1 = gray), by score.
  const sink = useRef(new Map<string, number>());
  const drag = useRef<{ id: string; x: number; y: number; vx: number; vy: number; t: number; moved: number } | null>(null);
  const engine = useRef<Matter.Engine | null>(null);
  const reduced = useRef(false);

  const [r, setR] = useState(0);
  const [narrow, setNarrow] = useState(false);
  const [question, setQuestion] = useState(initialQuestion);
  const [asked, setAsked] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [mode, setMode] = useState<Mode>("normal");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [hover, setHover] = useState<Hover | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);

  const byId = useMemo(() => new Map(faces.map((f) => [f.id, f])), [faces]);
  const byIdRef = useRef(byId);
  const answered = status !== "idle";

  // Face size is fixed per session, picked from the screen size.
  useLayoutEffect(() => {
    const el = stage.current!;
    reduced.current = prefersReducedMotion();
    setR(radiusFor(el.clientWidth, el.clientHeight));
    setNarrow(el.clientWidth < 640);
  }, []);

  // Physics: one engine, walls on three sides, faces dropped in from just
  // above the screen. With reduced motion the pile is settled before it shows.
  useEffect(() => {
    const el = stage.current!;
    if (!r) return;
    const all = bodies.current;
    const e = Matter.Engine.create({ gravity: { x: 0, y: 1.6 }, enableSleeping: true });
    engine.current = e;

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
      const b = Matter.Bodies.circle(r + Math.random() * (w - 2 * r), -r - Math.random() * h * 0.5, r, {
        restitution: 0,
        friction: 0.8,
        frictionAir: 0.02,
        density: 0.002,
        sleepThreshold: 30,
      });
      bodies.current.set(f.id, b);
      pos.current.set(f.id, { x: b.position.x, y: b.position.y, a: 0, s: 1 });
    });
    Matter.Composite.add(e.world, [...bodies.current.values()]);

    // Fixed physics step. Matter's integrator jitters when the step size
    // changes frame to frame (e.g. 120Hz phones), so bank time and step
    // exactly 1/60s at a time.
    const STEP = 1000 / 60;
    const settle = reduced.current ? 420 : 15;
    for (let i = 0; i < settle; i++) Matter.Engine.update(e, STEP);

    const written = new Map<string, string>();
    let raf = 0;
    let last = performance.now();
    let bank = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      bank += dt;

      // Launch faces whose turn has come: they leave the physics world.
      for (const [id, at] of lifted.current) {
        if (now >= at && !launched.current.has(id)) {
          launched.current.add(id);
          Matter.Composite.remove(e.world, bodies.current.get(id)!);
          const node = faceEls.current.get(id);
          if (node) {
            node.style.opacity = "1";
            const img = node.querySelector("img");
            const big = byIdRef.current.get(id)?.big;
            if (img && big && !img.src.endsWith(big)) img.src = big;
            // Reduced motion: the face appears in place instead of flying.
            if (reduced.current) node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
          }
        }
      }

      while (bank >= STEP) {
        const d = drag.current;
        if (d) {
          // Pull the held face toward the pointer by velocity, so it still
          // shoves the faces it runs into.
          const b = bodies.current.get(d.id)!;
          Matter.Body.setVelocity(b, { x: (d.x - b.position.x) * 0.35, y: (d.y - b.position.y) * 0.35 });
        }
        Matter.Engine.update(e, STEP);
        bank -= STEP;
      }

      const k = reduced.current ? 1 : 1 - Math.pow(1 - 0.14, dt / 16.7);
      const kPile = 1 - Math.pow(1 - 0.2, dt / 16.7);
      const box = el.getBoundingClientRect();
      const view = scroller.current?.getBoundingClientRect();
      for (const f of faces) {
        const p = pos.current.get(f.id)!;
        const node = faceEls.current.get(f.id);
        const out = launched.current.has(f.id);
        let hidden = false;
        if (out) {
          const slot = slotEls.current.get(f.id);
          if (slot) {
            const s = slot.getBoundingClientRect();
            p.x += (s.left - box.left + s.width / 2 - p.x) * k;
            p.y += (s.top - box.top + s.height / 2 - p.y) * k;
            p.a += (0 - p.a) * k;
            p.s += (s.width / (2 * r) - p.s) * k;
            // A picked face scrolled out of the results stays hidden.
            if (view && (s.bottom < view.top || s.top > view.bottom)) hidden = true;
          }
        } else {
          const b = bodies.current.get(f.id)!;
          p.x = b.position.x;
          p.y = b.position.y;
          p.a = b.angle;
          p.s += (1 - p.s) * kPile;
        }
        if (node) {
          // Real size, not a scale transform, so a floated-up face stays sharp.
          const size = Math.round(2 * r * p.s * 2) / 2;
          node.style.transform = `translate(${p.x - size / 2}px, ${p.y - size / 2}px) rotate(${p.a}rad)`;
          const g = out ? 0 : (sink.current.get(f.id) ?? 0);
          // Only touch layout and paint properties when they change.
          const focused = node === document.activeElement;
          const next = `${size}|${out}|${hidden}|${g}|${focused}`;
          if (written.get(f.id) !== next) {
            written.set(f.id, next);
            node.style.width = node.style.height = `${size}px`;
            node.style.zIndex = out ? "35" : focused ? "12" : "10";
            node.style.visibility = hidden ? "hidden" : "visible";
            node.style.filter = g ? `grayscale(${g}) contrast(${1 - g * 0.15})` : "";
            if (!out) node.style.opacity = String(1 - g * 0.4);
          }
        }
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

  // Float the picks out of the pile one at a time, best first, and let the
  // rest sink: faces fade toward gray by how far they missed.
  useLayoutEffect(() => {
    const e = engine.current;
    if (!e) return;
    const all = verdict?.ids ?? [];
    const cap = sizes(narrow, all.length - 1);
    const next = all.slice(0, 1 + cap.shown);
    const keep = new Set(next);
    const picked = new Set(all);
    for (const id of launched.current) {
      if (keep.has(id)) continue;
      const b = bodies.current.get(id)!;
      const p = pos.current.get(id)!;
      Matter.Body.setPosition(b, { x: p.x, y: p.y });
      Matter.Body.setVelocity(b, { x: 0, y: 0 });
      Matter.Sleeping.set(b, false);
      Matter.Composite.add(e.world, b);
      launched.current.delete(id);
    }
    const now = performance.now();
    const gap = reduced.current ? 0 : Math.min(90, 900 / Math.max(next.length, 1));
    const map = new Map<string, number>();
    next.forEach((id, i) => map.set(id, launched.current.has(id) ? 0 : now + (i === 0 ? 0 : 180 + i * gap)));
    lifted.current = map;

    sink.current.clear();
    if (status === "done" && verdict) {
      for (const f of faces) {
        if (picked.has(f.id)) continue;
        const s = scores[f.id];
        sink.current.set(f.id, s === undefined ? 1 : Math.min(1, Math.max(0, 1 - s / LIKELY)) ** 0.7);
      }
    }
  }, [verdict, status, scores, faces, narrow]);

  // Tapping a face in the pile makes it hop.
  const hop = useCallback((id: string) => {
    if (launched.current.has(id)) return;
    const b = bodies.current.get(id);
    if (!b) return;
    Matter.Sleeping.set(b, false);
    Matter.Body.setVelocity(b, { x: (Math.random() - 0.5) * 3, y: -9 });
    Matter.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.2);
  }, []);

  const local = (e: React.PointerEvent) => {
    const box = stage.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };

  // Grab a face: drag it around, fling it on release, or tap it to hop.
  const grab = useCallback((e: React.PointerEvent<HTMLDivElement>, id: string) => {
    setHover(anchor(id, e.currentTarget));
    if (launched.current.has(id)) return;
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

  // Desktop: sweeping the mouse through the pile pushes faces aside.
  const lastMouse = useRef<{ x: number; y: number } | null>(null);
  const nudge = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse" || drag.current || reduced.current) return;
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
        if (launched.current.has(id)) continue;
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
    },
    [r],
  );

  // Each question gets its own history entry, so Back steps to the last one.
  const ask = useCallback(async (q: string, history: "push" | "replace" | "none" = "push") => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuestion(trimmed);
    setAsked(trimmed);
    setStatus("asking");
    setError("");
    setVerdict(null);
    setShowAll(false);
    setHover(null);
    if (history !== "none") {
      const url = new URL(window.location.href);
      url.searchParams.set("q", trimmed);
      if (history === "push" && url.href !== window.location.href) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    }
    scroller.current?.scrollTo({ top: 0 });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Jev didn't answer.");
      if (data.blocked) {
        setStatus("blocked");
        return;
      }
      setMode(data.mode);
      setScores(data.scores);
      setVerdict(verdictFor(data.scores, data.mode as Mode));
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jev didn't answer.");
      setStatus("error");
    }
  }, []);

  const inputEl = useRef<HTMLInputElement>(null);
  const clear = useCallback((history = true) => {
    setQuestion("");
    setAsked("");
    setVerdict(null);
    setScores({});
    setError("");
    setStatus("idle");
    setHover(null);
    if (history && window.location.search) window.history.pushState(null, "", window.location.pathname);
    inputEl.current?.focus();
  }, []);

  useEffect(() => {
    const onPop = () => {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) ask(q, "none");
      else clear(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [ask, clear]);

  // Shared links (?q=...) ask on load, once the pile has landed. The answer is
  // usually cached, so this is quick.
  useEffect(() => {
    if (!initialQuestion) return;
    const t = setTimeout(() => ask(initialQuestion, "replace"), prefersReducedMotion() ? 0 : 900);
    return () => clearTimeout(t);
  }, [ask, initialQuestion]);

  // Tooltips from a tap fade on their own; mouse hover clears on leave.
  useEffect(() => {
    if (!hover) return;
    const t = setTimeout(() => setHover((h) => (h === hover ? null : h)), 2600);
    return () => clearTimeout(t);
  }, [hover]);

  // Keyboard: the pile is one tab stop. Arrow keys move between faces in
  // reading order, Enter or Space makes one hop.
  const pileOrder = useMemo(() => faces.filter((f) => !verdict?.ids.includes(f.id)), [faces, verdict]);
  const onPileKey = (e: React.KeyboardEvent, i: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) {
      e.preventDefault();
      const next = (i + step + pileOrder.length) % pileOrder.length;
      setFocusIdx(next);
      const el = faceEls.current.get(pileOrder[next].id);
      el?.focus();
      if (el) setHover(anchor(pileOrder[next].id, el));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      hop(pileOrder[i].id);
    }
  };

  const hovered = hover ? byId.get(hover.id) : null;
  const top = verdict ? byId.get(verdict.ids[0]) : null;
  const others = verdict ? verdict.ids.slice(1) : [];
  const size = sizes(narrow, others.length);
  const tie = verdict?.tie ? byId.get(verdict.tie) : null;
  const sure = mode !== "out"; // "out" answers come from a checked list, not a Jev guess
  const shareText = top
    ? `Jev picked ${top.name}${sure ? ` (${pct(scores[top.id])})` : ""}: “${asked}”`
    : `“${asked}” on Jev!`;
  const more = EXAMPLES.filter((q) => q.toLowerCase() !== asked.toLowerCase());

  const slot = (id: string, px: number, focusable = true) => {
    const f = byId.get(id)!;
    return (
      <div
        ref={(n) => {
          if (n) slotEls.current.set(id, n);
          else slotEls.current.delete(id);
        }}
        tabIndex={focusable ? 0 : -1}
        role={focusable ? "img" : undefined}
        aria-hidden={focusable ? undefined : true}
        aria-label={focusable ? `${f.name}${sure ? `, ${pct(scores[id])}` : ""}` : undefined}
        onFocus={(e) => setHover(anchor(id, e.currentTarget))}
        onBlur={() => setHover((h) => (h?.id === id ? null : h))}
        className="shrink-0 rounded-full"
        style={{ width: px, height: px }}
      />
    );
  };

  const chip =
    "inline-flex h-11 shrink-0 items-center rounded-full border border-line bg-paper/90 px-4 text-sm text-ink-soft transition-[color,border-color,transform] duration-150 ease-out hover:border-ink/30 hover:text-ink active:scale-[0.97]";

  return (
    <div ref={stage} onPointerMove={nudge} className="relative h-svh w-full overflow-hidden select-none">
      {/* The column scrolls when a big verdict outgrows the screen. It lets
          pointer events fall through to the pile except on its own content. */}
      <div
        ref={scroller}
        tabIndex={-1}
        className="no-scrollbar pointer-events-none relative z-20 h-full overflow-y-auto overscroll-contain"
      >
        <nav className="flex items-center justify-between px-3 text-xs text-ink-faint *:pointer-events-auto">
          <a href="https://bananaintelligence.ai" className="inline-flex h-11 items-center px-1 hover:text-ink">
            A Banana Intelligence product
          </a>
          <a href="/credits" className="inline-flex h-11 items-center px-1 hover:text-ink">
            Photo credits
          </a>
        </nav>

        <main className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-8 *:pointer-events-auto">
          <h1
            className={`font-logo leading-none tracking-[-0.025em] text-jev ${
              answered ? "text-5xl sm:text-[4rem]" : "text-8xl sm:text-[8rem]"
            }`}
          >
            {answered ? (
              <button type="button" onClick={() => clear()} aria-label="Jev! Start over">
                Jev!
              </button>
            ) : (
              "Jev!"
            )}
          </h1>
          {!answered && (
            <p className="mt-3 text-center text-base text-pretty text-ink-soft">
              America’s 100 most famous politicians.<br className="sm:hidden" /> You ask. Jev, an AI, picks.
            </p>
          )}

          <form
            className={`w-full max-w-xl ${answered ? "mt-4" : "mt-6"}`}
            onSubmit={(e) => {
              e.preventDefault();
              if (!question.trim()) inputEl.current?.focus();
              else if (status !== "asking") ask(question);
            }}
          >
            <div className="flex h-14 items-center gap-1 rounded-2xl border border-ink/12 bg-paper pl-4 pr-2 transition-[border-color,box-shadow] duration-150 has-[input:focus-visible]:border-jev has-[input:focus-visible]:shadow-[0_0_0_1px_var(--color-jev)]">
              <input
                ref={inputEl}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") clear();
                }}
                maxLength={140}
                enterKeyHint="go"
                placeholder="Ask about any of the 100…"
                aria-label="Ask Jev about politicians"
                className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none sm:text-xl placeholder:text-ink-faint focus-visible:outline-none"
              />
              {(question || answered) && (
                <button
                  type="button"
                  onClick={() => clear()}
                  aria-label="Clear and start over"
                  title="Clear (Esc)"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <button
                type="submit"
                aria-disabled={!question.trim() || status === "asking"}
                className="h-11 shrink-0 rounded-lg bg-jev px-5 text-base font-semibold text-paper transition-[background-color,transform] duration-150 ease-out hover:bg-jev-deep active:scale-[0.97]"
              >
                Ask
              </button>
            </div>
          </form>

          {!answered && (
            <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2">
              {EXAMPLES.slice(0, narrow ? 4 : 6).map((q) => (
                <button key={q} type="button" onClick={() => ask(q)} className={chip}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div
            aria-live="polite"
            className={`w-full ${
              status === "done" || status === "blocked" || status === "error"
                ? "mt-6 rounded-2xl border border-line bg-paper px-4 pb-5 shadow-[0_1px_2px_rgba(21,21,21,0.04),0_8px_24px_rgba(21,21,21,0.06)]"
                : ""
            }`}
          >
            {status === "asking" && (
              <p className="mt-8 text-center text-base text-ink-soft">Jev is weighing all 100…</p>
            )}
            {status === "error" && (
              <div className="rise flex flex-col items-center gap-3 pt-6 text-center">
                <h2 className="text-base font-semibold text-ink">{error}</h2>
                <button type="button" onClick={() => ask(asked, "none")} className={chip}>
                  Try again
                </button>
              </div>
            )}
            {status === "blocked" && (
              <div className="rise pt-6 text-center">
                <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">Jev won’t touch that one.</h2>
                <p className="mt-2 text-base text-ink-soft">No guessing about abuse or private lives.</p>
              </div>
            )}
            {status === "done" && !verdict && (
              <div className="rise pt-6 text-center">
                {mode === "strict" ? (
                  <>
                    <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">Jev isn’t sure enough to name anyone.</h2>
                    <p className="mt-2 text-base text-ink-soft">Accusations need 90% or better.</p>
                  </>
                ) : (
                  <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">Jev says: nobody.</h2>
                )}
              </div>
            )}

            {status === "done" && verdict && top && (
              <section className="flex flex-col items-center pt-6">
                {slot(top.id, size.hero)}
                <h2 className="rise mt-4 text-center font-logo [animation-delay:240ms] motion-reduce:[animation-delay:0ms] text-2xl leading-tight tracking-[-0.01em] text-balance text-ink sm:text-[2rem]">
                  {top.name}
                </h2>
                <p className="rise mt-1 text-center text-base text-pretty text-ink-soft [animation-delay:300ms] motion-reduce:[animation-delay:0ms]">
                  {sure ? (
                    <>
                      {verdict.label} · <span className="tabular-nums text-ink">{pct(scores[top.id])}</span>
                      {tie && (
                        <>
                          , a near tie with {tie.name} <span className="tabular-nums">({pct(scores[tie.id])})</span>
                        </>
                      )}
                    </>
                  ) : (
                    "On the public record"
                  )}
                </p>

                <div className="mt-5">
                  <Share question={asked} text={shareText} />
                </div>
                <p className="mt-3 text-center text-xs text-ink-soft">
                  {sure ? (
                    <>
                      “{asked}” · Jev’s opinion, not fact. Mad about it? <span className="font-semibold text-jev-deep">Blame Jev.</span>
                    </>
                  ) : (
                    <>Answered only from politicians who have said so publicly.</>
                  )}
                </p>
                {others.length > 0 && (
                  <div className="mt-8 flex w-full flex-col items-center">
                    <h3 className="text-sm font-medium text-ink-soft">
                      Also floated up <span className="tabular-nums">{others.length}</span>
                    </h3>
                    <ul className="mt-4 flex max-w-2xl justify-center gap-x-3">
                      {others.slice(0, size.named).map((id) => (
                        <li key={id} className="flex w-[76px] flex-col items-center">
                          {slot(id, Math.max(size.other, narrow ? 48 : 56))}
                          <span className="mt-2 text-center text-xs leading-tight font-medium text-balance text-ink">
                            {byId.get(id)!.name}
                          </span>
                          {sure && <span className="text-xs tabular-nums text-ink-soft">{pct(scores[id])}</span>}
                        </li>
                      ))}
                    </ul>
                    {others.length > size.named && (
                      <>
                        {size.shown > size.named && (
                          <ul aria-hidden className="mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
                            {others.slice(size.named, size.shown).map((id) => (
                              <li key={id}>{slot(id, size.other, false)}</li>
                            ))}
                          </ul>
                        )}
                        {/* The names are the answer, so every pick is listed, not just pictured. */}
                        <ul className="mt-4 flex max-w-xl flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                          {(showAll ? others.slice(size.named) : others.slice(size.named, size.named + (narrow ? 6 : 12))).map((id) => (
                            <li key={id} className="whitespace-nowrap">
                              <span className="text-ink">{byId.get(id)!.name}</span>
                              {sure && <span> {pct(scores[id])}</span>}
                            </li>
                          ))}
                          {!showAll && others.length - size.named > (narrow ? 6 : 12) && (
                            <li>
                              <button
                                type="button"
                                onClick={() => setShowAll(true)}
                                className="-my-3 inline-flex min-h-11 items-center font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                              >
                                and {others.length - size.named - (narrow ? 6 : 12)} more
                              </button>
                            </li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                )}

              </section>
            )}

            {(status === "done" || status === "blocked" || status === "error") && (
              <div className="mt-6 flex flex-col items-center border-t border-line pt-5">
                <h3 className="text-sm font-medium text-ink-soft">Ask another</h3>
                <div className="no-scrollbar -mx-4 mt-3 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:mx-0 sm:w-full sm:justify-center sm:overflow-visible sm:px-0 sm:[mask-image:none]">
                  {more.slice(0, narrow ? more.length : 3).map((q) => (
                    <button key={q} type="button" onClick={() => ask(q)} className={chip}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* While Jev weighs the pile, a soft band of light passes over it. */}
      {status === "asking" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-1/2 overflow-hidden motion-reduce:hidden"
          style={{ maskImage: "linear-gradient(to bottom, transparent, black 40%)" }}
        >
          <div
            className="h-full w-1/2"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0.55) 55%, transparent)",
              animation: "sweep 1.1s cubic-bezier(0.45, 0, 0.55, 1) infinite",
            }}
          />
        </div>
      )}

      {/* Faces share one layer; the physics loop writes their size, position, and z-order. */}
      <div
        role="group"
        aria-label="The pile of 100 politicians. Use arrow keys to move between faces, Enter to make one hop."
        className="pointer-events-none absolute inset-0"
      >
        {r > 0 &&
          faces.map((f) => {
            const i = pileOrder.indexOf(f);
            const inPile = i !== -1;
            return (
              <div
                key={f.id}
                ref={(n) => {
                  if (n) faceEls.current.set(f.id, n);
                  else faceEls.current.delete(f.id);
                }}
                role={inPile ? "button" : undefined}
                aria-label={inPile ? `${f.name}, ${f.role}` : undefined}
                aria-hidden={inPile ? undefined : true}
                tabIndex={inPile ? (i === Math.min(focusIdx, pileOrder.length - 1) ? 0 : -1) : -1}
                onKeyDown={inPile ? (e) => onPileKey(e, i) : undefined}
                onFocus={(e) => setHover(anchor(f.id, e.currentTarget))}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHover(anchor(f.id, e.currentTarget))}
                onPointerDown={(e) => grab(e, f.id)}
                onPointerMove={moveDrag}
                onPointerUp={release}
                onPointerCancel={release}
                onPointerLeave={(e) => e.pointerType === "mouse" && setHover((h) => (h?.id === f.id ? null : h))}
                className="pointer-events-auto absolute left-0 top-0 cursor-grab touch-none overflow-hidden rounded-full bg-line shadow-[0_1px_2px_rgba(0,0,0,0.18),0_4px_10px_rgba(0,0,0,0.10)] ring-2 ring-paper transition-[filter,opacity] duration-700 ease-out will-change-transform active:cursor-grabbing"
                style={{ width: r * 2, height: r * 2, transform: "translate(-200px, -200px)" }}
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
            );
          })}
      </div>

      {/* The name tag sits beside the face it names, never over the controls. */}
      {hovered && hover && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-40 max-w-[min(20rem,calc(100vw-2rem))] truncate rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-[0_2px_4px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.16)]"
          style={{ left: hover.x, top: hover.y, transform: `translate(-50%, ${hover.below ? "0" : "-100%"})` }}
        >
          <span className="font-medium">{hovered.name}</span>
          <span className="text-paper/70"> · {hovered.role}</span>
          {scores[hovered.id] !== undefined && sure && (
            <span className="tabular-nums text-paper/70"> · {pct(scores[hovered.id])}</span>
          )}
        </div>
      )}
    </div>
  );
}
