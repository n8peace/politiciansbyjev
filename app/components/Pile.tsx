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
type Status = "idle" | "asking" | "done" | "error";

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
  const engine = useRef<Matter.Engine | null>(null);
  const [r, setR] = useState(0);
  const [narrow, setNarrow] = useState(false);

  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
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
    const e = Matter.Engine.create({ gravity: { x: 0, y: 1.1 } });
    engine.current = e;

    // Oversized walls so a resize only needs a reposition.
    const opts = { isStatic: true };
    const floor = Matter.Bodies.rectangle(0, 0, 20000, 100, opts);
    const left = Matter.Bodies.rectangle(0, 0, 100, 20000, opts);
    const right = Matter.Bodies.rectangle(0, 0, 100, 20000, opts);
    const placeWalls = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      Matter.Body.setPosition(floor, { x: w / 2, y: h + 50 });
      Matter.Body.setPosition(left, { x: -50, y: h - 10000 });
      Matter.Body.setPosition(right, { x: w + 50, y: h - 10000 });
    };
    placeWalls();
    Matter.Composite.add(e.world, [floor, left, right]);

    const w = el.clientWidth;
    faces.forEach((f, i) => {
      const b = Matter.Bodies.circle(
        r + Math.random() * (w - 2 * r),
        -r * 2 - i * (r * 0.9),
        r,
        { restitution: 0.25, friction: 0.4, density: 0.002 },
      );
      bodies.current.set(f.id, b);
      pos.current.set(f.id, { x: b.position.x, y: b.position.y, a: 0, s: 1 });
    });
    Matter.Composite.add(e.world, [...bodies.current.values()]);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      Matter.Engine.update(e, Math.min(now - last, 32));
      last = now;
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
            p.x += (tx - p.x) * 0.16;
            p.y += (ty - p.y) * 0.16;
            p.a += (0 - p.a) * 0.16;
            p.s += (s.width / (2 * r) - p.s) * 0.16;
          }
        } else {
          const b = bodies.current.get(f.id)!;
          p.x = b.position.x;
          p.y = b.position.y;
          p.a = b.angle;
          p.s += (1 - p.s) * 0.2;
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

    const onResize = () => placeWalls();
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
      Matter.Body.setVelocity(b, { x: (Math.random() - 0.5) * 6, y: 2 });
      Matter.Composite.add(e.world, b);
    }
    for (const id of next) {
      if (!lifted.current.has(id)) Matter.Composite.remove(e.world, bodies.current.get(id)!);
    }
    lifted.current = next;
  }, [tiers]);

  // Give the pile a nudge so it looks like Jev is rummaging through it.
  const rummage = useCallback(() => {
    for (const [id, b] of bodies.current) {
      if (lifted.current.has(id)) continue;
      Matter.Body.setVelocity(b, {
        x: (Math.random() - 0.5) * 4,
        y: -2 - Math.random() * 5,
      });
    }
  }, []);

  const ask = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setQuestion(trimmed);
      setAsked(trimmed);
      setStatus("asking");
      setError("");
      setTiers([]);
      rummage();
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
        setScores(data.scores);
        setTiers(groupScores(data.scores));
        setStatus("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Jev didn't answer.");
        setStatus("error");
      }
    },
    [rummage],
  );

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
    <div ref={stage} className="relative h-dvh w-full overflow-hidden select-none">
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
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={140}
            placeholder="Who's the most corrupt?"
            aria-label="Ask Jev about politicians"
            className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-lg shadow-[0_2px_20px_rgba(0,0,0,0.06)] outline-none placeholder:text-ink-faint focus:border-ink-faint"
          />
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
          {status === "done" && total === 0 && (
            <p className="text-center text-ink-soft">
              Jev says: <span className="font-semibold text-ink">nobody.</span>
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
              &ldquo;{asked}&rdquo; · picked by Jev, an AI, not by us. Mad about it?{" "}
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
            onPointerLeave={() => setHover((h) => (h === f.id ? null : h))}
            className="pointer-events-auto absolute left-0 top-0 overflow-hidden rounded-full bg-line shadow-[0_1px_4px_rgba(0,0,0,0.25)] ring-2 ring-white will-change-transform"
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
