"use client";

import Matter from "matter-js";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { groupScores, type Tier } from "@/lib/tiers";

export type Face = { id: string; name: string; role: string; img: string };

const EXAMPLES = [
  "Who's the most corrupt?",
  "Who's the richest?",
  "Best president ever",
  "Who would win a fistfight?",
  "Who's the funniest?",
  "Who has the best hair?",
];

type Pos = { x: number; y: number; a: number; s: number };
type Status = "idle" | "asking" | "done" | "blocked" | "error";

// Size faces so the settled pile fills about a quarter of the screen.
function radiusFor(width: number, height: number) {
  const r = Math.sqrt((width * height * 0.26) / (100 * 3.6));
  return Math.round(Math.min(32, Math.max(14, r)));
}

// Lifted faces shrink as the crowd grows so big groups still fit.
// Names show only while there's room for them.
function slotLayout(tier: Tier["key"], total: number, narrow: boolean) {
  if (narrow) {
    if (total > 30) return { size: 26, names: false };
    if (total > 12) return { size: 34, names: false };
    if (total > 4) return { size: 44, names: false };
    return { size: 60, names: true };
  }
  if (total > 30) return { size: 34, names: false };
  if (total > 12) return { size: 44, names: false };
  return { size: tier === "likely" ? 56 : 72, names: true };
}

export default function Pile({ faces }: { faces: Face[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const faceEls = useRef(new Map<string, HTMLDivElement>());
  const slotEls = useRef(new Map<string, HTMLDivElement>());
  const bodies = useRef(new Map<string, Matter.Body>());
  const pos = useRef(new Map<string, Pos>());
  const lifted = useRef(new Set<string>());
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
  const [r, setR] = useState(0);
  const [narrow, setNarrow] = useState(false);

  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [strict, setStrict] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const byId = useMemo(() => new Map(faces.map((f) => [f.id, f])), [faces]);

  // Face size is fixed per session, picked from the screen width.
  useLayoutEffect(() => {
    const el = stage.current!;
    setR(radiusFor(el.clientWidth, el.clientHeight));
    setNarrow(el.clientWidth < 640);
  }, []);

  // Physics: one engine, walls on three sides, faces dropped in from above.
  useEffect(() => {
    const el = stage.current!;
    if (!r) return;
    const all = bodies.current;
    const e = Matter.Engine.create({ gravity: { x: 0, y: 1 }, enableSleeping: true });
    engine.current = e;

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
        -r - Math.random() * el.clientHeight * 0.9,
        r,
        { restitution: 0, friction: 0.8, frictionAir: 0.02, density: 0.002, sleepThreshold: 30 },
      );
      bodies.current.set(f.id, b);
      pos.current.set(f.id, { x: b.position.x, y: b.position.y, a: 0, s: 1 });
    });
    Matter.Composite.add(e.world, [...bodies.current.values()]);

    // Fixed physics step. Matter's integrator jitters when the step size
    // changes frame to frame (e.g. 120Hz phones), so bank time and step
    // exactly 1/60s at a time.
    const STEP = 1000 / 60;
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
        Matter.Engine.update(e, STEP);
        bank -= STEP;
      }
      const k = 1 - Math.pow(1 - 0.16, dt / 16.7);
      const kPile = 1 - Math.pow(1 - 0.2, dt / 16.7);
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
            p.s += (s.width / (2 * r) - p.s) * k;
          }
        } else {
          const b = bodies.current.get(f.id)!;
          p.x = b.position.x;
          p.y = b.position.y;
          p.a = b.angle;
          p.s += (1 - p.s) * kPile;
        }
        if (node) {
          node.style.transform = `translate(${p.x - r}px, ${p.y - r}px) rotate(${p.a}rad) scale(${p.s})`;
          // Picked faces sit above the results; the pile sits behind them.
          node.style.zIndex = lifted.current.has(f.id) ? "35" : "10";
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

  // Move faces between the pile and the result slots whenever tiers change.
  useLayoutEffect(() => {
    const e = engine.current;
    if (!e) return;
    const next = new Set(tiers.flatMap((t) => t.ids));
    for (const id of lifted.current) {
      if (next.has(id)) continue;
      const b = bodies.current.get(id)!;
      const p = pos.current.get(id)!;
      Matter.Body.setPosition(b, { x: p.x, y: p.y });
      Matter.Body.setVelocity(b, { x: 0, y: 0 });
      Matter.Sleeping.set(b, false);
      Matter.Composite.add(e.world, b);
    }
    for (const id of next) {
      if (!lifted.current.has(id)) Matter.Composite.remove(e.world, bodies.current.get(id)!);
    }
    lifted.current = next;
  }, [tiers]);

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

  // Desktop: sweeping the mouse through the pile pushes faces aside.
  const lastMouse = useRef<{ x: number; y: number } | null>(null);
  const nudge = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || drag.current) return;
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

  const ask = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setQuestion(trimmed);
      setAsked(trimmed);
      setStatus("asking");
      setError("");
      setTiers([]);
      const url = new URL(window.location.href);
      url.searchParams.set("q", trimmed);
      window.history.replaceState(null, "", url);
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
        setStrict(data.mode === "strict");
        setScores(data.scores);
        setTiers(groupScores(data.scores, data.mode));
        setStatus("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Jev didn't answer.");
        setStatus("error");
      }
    },
    [],
  );

  const inputEl = useRef<HTMLInputElement>(null);
  const clear = useCallback(() => {
    setQuestion("");
    setAsked("");
    setTiers([]);
    setScores({});
    setError("");
    setStatus("idle");
    window.history.replaceState(null, "", window.location.pathname);
    inputEl.current?.focus();
  }, []);

  // Shared links (?q=...) ask on load, once the pile has landed.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    const t = setTimeout(() => ask(q), 2000);
    return () => clearTimeout(t);
  }, [ask]);

  const total = tiers.reduce((n, t) => n + t.ids.length, 0);
  const hovered = hover ? byId.get(hover) : null;

  return (
    <div
      ref={stage}
      onPointerMove={nudge}
      className="relative h-svh w-full overflow-hidden select-none"
    >
      <a
        href="/credits"
        className="absolute right-3 top-3 z-40 text-xs text-ink-faint hover:text-ink"
      >
        Photo credits
      </a>
      <main className="relative z-20 mx-auto flex max-w-3xl flex-col items-center px-4 pt-6 sm:pt-12">
        <h1 className="font-logo text-[5.5rem] leading-none tracking-tight text-jev sm:text-[8rem]">
          Jev!
        </h1>
        <p className="mt-2 text-center text-sm text-ink-soft sm:text-base">
          America&apos;s 100 most famous politicians.<br className="sm:hidden" /> You ask. An AI picks.
        </p>

        <form
          className="mt-6 w-full max-w-xl"
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
              placeholder="Who's the most corrupt?"
              aria-label="Ask Jev about politicians"
              className="w-full rounded-2xl border border-line bg-white py-4 pl-5 pr-14 text-lg shadow-[0_2px_20px_rgba(0,0,0,0.06)] outline-none placeholder:text-ink-faint focus:border-ink-faint"
            />
            {(question || status !== "idle") && (
              <button
                type="button"
                onClick={clear}
                aria-label="Clear and ask something else"
                title="Clear (Esc)"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-line/70 text-ink-soft hover:bg-line hover:text-ink"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {status === "idle" && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="rounded-full border border-line bg-white/80 px-3 py-1.5 text-sm text-ink-soft backdrop-blur hover:border-ink-faint hover:text-ink"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div
          className={`mt-4 flex w-full flex-col items-center gap-3 rounded-3xl px-3 py-3 sm:mt-6 sm:gap-5 ${status === "done" ? "bg-white/85 backdrop-blur-sm" : ""}`}
          aria-live="polite"
        >
          {status === "asking" && <p className="text-ink-soft">Jev is digging through the pile…</p>}
          {status === "error" && <p className="text-jev">{error}</p>}
          {status === "blocked" && (
            <p className="max-w-md text-center text-ink-soft">
              <span className="font-semibold text-ink">Jev won&apos;t touch that one.</span> It
              doesn&apos;t guess about abuse or people&apos;s private lives. Ask it something else.
            </p>
          )}
          {status === "done" && total === 0 && (
            <p className="max-w-md text-center text-ink-soft">
              {strict ? (
                <>
                  <span className="font-semibold text-ink">Jev isn&apos;t sure enough to name anyone.</span>{" "}
                  For accusations, it only answers when it&apos;s 90% sure.
                </>
              ) : (
                <>
                  Jev says: <span className="font-semibold text-ink">nobody.</span>
                </>
              )}
            </p>
          )}
          {tiers.map((t) => (
            <section key={t.key} className="flex w-full flex-col items-center">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                {t.label}
                <span className="ml-2 font-normal normal-case tracking-normal text-ink-faint">
                  {t.ids.length}
                </span>
              </h2>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
                {t.ids.map((id) => {
                  const { size, names } = slotLayout(t.key, total, narrow);
                  const f = byId.get(id)!;
                  return (
                    <div key={id} className="flex flex-col items-center" style={{ width: names ? Math.max(size, 84) : size }}>
                      <div
                        ref={(n) => {
                          if (n) slotEls.current.set(id, n);
                          else slotEls.current.delete(id);
                        }}
                        style={{ width: size, height: size }}
                      />
                      {names && (
                        <>
                          <span className="mt-1 text-center text-xs font-medium leading-tight text-ink">{f.name}</span>
                          <span className="text-[11px] tabular-nums text-ink-faint">
                            {Math.round((scores[id] ?? 0) * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {status === "done" && (
            <p className="text-center text-xs text-ink-faint">
              &ldquo;{asked}&rdquo; · Jev’s opinion, not fact. Mad about it?{" "}
              <span className="font-semibold text-jev">Blame Jev.</span>
            </p>
          )}
        </div>
      </main>

      {/* Faces share one layer; the physics loop writes their transforms and z-order. */}
      <div className="pointer-events-none absolute inset-0">
        {r > 0 && faces.map((f) => (
          <div
            key={f.id}
            ref={(n) => {
              if (n) faceEls.current.set(f.id, n);
              else faceEls.current.delete(f.id);
            }}
            onPointerEnter={() => setHover(f.id)}
            onPointerDown={(e) => grab(e, f.id)}
            onPointerMove={moveDrag}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={() => setHover((h) => (h === f.id ? null : h))}
            className="pointer-events-auto absolute left-0 top-0 cursor-grab touch-none overflow-hidden rounded-full active:cursor-grabbing bg-line shadow-[0_1px_4px_rgba(0,0,0,0.25)] ring-2 ring-white will-change-transform"
            style={{
              width: r * 2,
              height: r * 2,
              transform: "translate(-200px, -200px)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.img}
              alt={f.name}
              draggable={false}
              loading="eager"
              className="h-full w-full object-cover"
              style={{ objectPosition: "50% 22%" }}
            />
          </div>
        ))}
      </div>

      {hovered && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
          <span className="font-semibold">{hovered.name}</span>
          <span className="text-white/70"> · {hovered.role}</span>
          {scores[hovered.id] !== undefined && (
            <span className="tabular-nums text-white/70"> · {Math.round(scores[hovered.id] * 100)}%</span>
          )}
        </div>
      )}
    </div>
  );
}
