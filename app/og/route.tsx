import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getAnswer, MAX_LEN } from "@/lib/answer";
import { limited } from "@/lib/limit";
import { politicians } from "@/lib/politicians";
import { pct, verdictFor, type Verdict } from "@/lib/verdict";

// The share card: 1200x630, one per question. It reads the same cached answer
// the page shows, so it never disagrees with the site and costs no extra Jev
// call. Like the site, it ends in the pile: everyone in gray, the picks in
// color, rising out of it. Refusals never print the visitor's question, so a
// crafted "question" can't put a claim on our card.

export const runtime = "nodejs";
export const maxDuration = 30;

const INK = "#151515";
const SOFT = "#5b5b5b";
const RED = "#e1261c";
const PAPER = "#fcfbf8";
const byId = new Map(politicians.map((p) => [p.id, p]));

const font = (pkg: string, file: string) =>
  readFile(path.join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

const cache = new Map<string, string>();
async function img(dir: "" | "sm" | "gray", id: string) {
  const key = `${dir}/${id}`;
  let src = cache.get(key);
  if (!src) {
    const buf = await readFile(path.join(process.cwd(), "public/faces", dir, `${id}.jpg`));
    src = `data:image/jpeg;base64,${buf.toString("base64")}`;
    cache.set(key, src);
  }
  return src;
}

function Face({ src, size, ring, lift = false }: { src: string; size: number; ring: number; lift?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: size,
        border: `${ring}px solid ${PAPER}`,
        boxShadow: lift
          ? "0 2px 4px rgba(0,0,0,0.14), 0 14px 32px rgba(0,0,0,0.16)"
          : "0 1px 2px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08)",
        overflow: "hidden",
        background: "#e6e4df",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={src} width={size} height={size} style={{ objectFit: "cover", objectPosition: "50% 22%" }} />
    </div>
  );
}

const Wordmark = ({ size }: { size: number }) => (
  <div style={{ fontFamily: "Archivo Black", fontSize: size, color: RED, letterSpacing: -size * 0.025, lineHeight: 1 }}>
    Jev!
  </div>
);

const Site = ({ note }: { note?: string }) => (
  <div style={{ display: "flex", fontSize: 22, color: SOFT }}>{`politiciansbyjev.vercel.app${note ? ` · ${note}` : ""}`}</div>
);

// A strip of the pile along the bottom edge. Faces are placed on a loose
// hexagonal grid with a seeded jitter, so a card always looks the same.
async function pileStrip(seed: string, picks: string[], allColor = false) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;

  const size = 78;
  const step = 54;
  const cols = Math.ceil(1200 / step) + 1;
  const rest = politicians.map((p) => p.id).filter((id) => !picks.includes(id));
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  // Picks sit in the top row, spread across the width.
  const spots: { id: string; x: number; y: number; pick: boolean }[] = [];
  const pickCols = new Map(picks.slice(0, 8).map((id, i, a) => [Math.round(((i + 0.5) / a.length) * (cols - 2)), id]));
  let n = 0;
  for (let row = 0; row < 2; row++) {
    for (let c = 0; c < cols; c++) {
      const pick = row === 0 ? pickCols.get(c) : undefined;
      const id = pick ?? rest[n++ % rest.length];
      const x = c * step - (row % 2 ? step / 2 : 0) - 20 + (rand() - 0.5) * 10;
      const y = row * 46 + (rand() - 0.5) * 10 - (pick ? 34 : 0);
      spots.push({ id, x, y, pick: Boolean(pick) });
    }
  }
  // Gray first, so the colored picks draw on top.
  spots.sort((a, b) => Number(a.pick) - Number(b.pick));
  const srcs = await Promise.all(spots.map((s) => img(s.pick || allColor ? "sm" : "gray", s.id)));
  return (
    <div style={{ display: "flex", position: "absolute", left: 0, bottom: 0, width: 1200, height: 150 }}>
      {spots.map((s, i) => (
        <div key={i} style={{ display: "flex", position: "absolute", left: s.x, top: s.y + 24 }}>
          <Face src={srcs[i]} size={s.pick ? size + 10 : size} ring={4} lift={s.pick} />
        </div>
      ))}
    </div>
  );
}

const Frame = ({ children, strip }: { children: React.ReactNode; strip: React.ReactNode }) => (
  <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: PAPER }}>
    <div style={{ display: "flex", width: "100%", height: 480, padding: "56px 72px 0" }}>{children}</div>
    {strip}
  </div>
);

async function home() {
  return (
    <Frame strip={await pileStrip("home", [], true)}>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <Wordmark size={168} />
        <div style={{ display: "flex", flexDirection: "column", fontSize: 44, color: INK, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.2 }}>
          <span>America’s 100 most famous politicians.</span>
          <span style={{ color: SOFT }}>You ask. Jev, an AI, picks.</span>
        </div>
      </div>
    </Frame>
  );
}

async function plain(line: string, note?: string) {
  return (
    <Frame strip={await pileStrip(line, [])}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Wordmark size={72} />
          <Site />
        </div>
        <div style={{ marginTop: 96, fontSize: 64, color: INK, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.1 }}>{line}</div>
        {note && <div style={{ marginTop: 16, fontSize: 32, color: SOFT }}>{note}</div>}
      </div>
    </Frame>
  );
}

async function verdictCard(question: string, scores: Record<string, number>, v: Verdict, sure: boolean, fact: boolean) {
  const top = byId.get(v.ids[0])!;
  // Sized to stay readable when a feed shrinks the card to ~500px wide.
  const qSize = question.length > 60 ? 34 : 42;
  const runners = v.ids.slice(1, 3).map((id) => byId.get(id)!.name);
  return (
    <Frame strip={await pileStrip(question, v.ids)}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Wordmark size={64} />
          <Site note={!sure ? "From the public record" : fact ? "Jev’s read, not a fact-check" : "Jev’s opinion, not fact"} />
        </div>
        <div style={{ marginTop: 32, fontSize: qSize, color: SOFT, fontWeight: 500, letterSpacing: -0.5, lineHeight: 1.2 }}>
          {`“${question}”`}
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: "Archivo Black",
            fontSize: top.name.length > 18 ? 64 : 80,
            color: INK,
            letterSpacing: -1.5,
            lineHeight: 1,
          }}
        >
          {top.name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 18, color: INK }}>
          {sure && <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>{pct(scores[top.id])}</span>}
          <span style={{ fontSize: 30, color: SOFT }}>{sure ? v.label : "On the public record"}</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 26, color: SOFT }}>
          {runners.length ? `Then ${runners.join(", ")}${v.ids.length > 3 ? ` +${v.ids.length - 3}` : ""}` : ""}
        </div>
      </div>
      <Face src={await img("", top.id)} size={300} ring={8} lift />
    </Frame>
  );
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, MAX_LEN);

  let body: React.ReactElement;
  if (!q) {
    body = await home();
  } else if (limited(req)) {
    return new Response("Slow down.", { status: 429 });
  } else {
    const a = await getAnswer(q).catch(() => null);
    if (!a) body = await plain("Ask Jev about America’s 100 most famous politicians.");
    else if ("blocked" in a) body = await plain("Jev won’t touch that one.");
    else {
      const v = verdictFor(a.scores, a.mode);
      if (v) body = await verdictCard(q, a.scores, v, a.mode !== "out", a.kind === "fact");
      else if (a.mode === "strict") body = await plain("Jev isn’t sure enough to name anyone.", "Accusations need 90% or better.");
      else body = await plain("Jev says: nobody.");
    }
  }

  const [archivo, g400, g500, g600] = await Promise.all([
    font("archivo-black", "archivo-black-latin-400-normal.woff"),
    font("geist-sans", "geist-sans-latin-400-normal.woff"),
    font("geist-sans", "geist-sans-latin-500-normal.woff"),
    font("geist-sans", "geist-sans-latin-600-normal.woff"),
  ]);
  const root = <div style={{ display: "flex", width: "100%", height: "100%", fontFamily: "Geist" }}>{body}</div>;
  const png = await new ImageResponse(root, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Archivo Black", data: archivo, weight: 400, style: "normal" },
      { name: "Geist", data: g400, weight: 400, style: "normal" },
      { name: "Geist", data: g500, weight: 500, style: "normal" },
      { name: "Geist", data: g600, weight: 600, style: "normal" },
    ],
  }).arrayBuffer();
  // JPEG keeps the card around 100KB; WhatsApp skips preview images over ~300KB.
  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
