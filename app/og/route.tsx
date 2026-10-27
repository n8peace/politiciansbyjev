import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getAnswer, MAX_LEN } from "@/lib/answer";
import { limited } from "@/lib/limit";
import { politicians } from "@/lib/politicians";
import { pct, verdictFor } from "@/lib/verdict";

// The share card: 1200x630, one per question. It reads the same cached answer
// the page shows, so it never disagrees with the site and costs no extra Jev
// call. Sensitive results never print the visitor's question on our card.

export const runtime = "nodejs";
export const maxDuration = 30;

const INK = "#151515";
const SOFT = "#5b5b5b";
const RED = "#e1261c";
const PAPER = "#fcfbf8";
const byId = new Map(politicians.map((p) => [p.id, p]));

const font = (pkg: string, file: string) =>
  readFile(path.join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

const faceCache = new Map<string, string>();
async function face(id: string) {
  let src = faceCache.get(id);
  if (!src) {
    const buf = await readFile(path.join(process.cwd(), "public/faces", `${id}.jpg`));
    src = `data:image/jpeg;base64,${buf.toString("base64")}`;
    faceCache.set(id, src);
  }
  return src;
}

function Face({ src, size, ring = 6 }: { src: string; size: number; ring?: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: size,
        border: `${ring}px solid white`,
        boxShadow: "0 2px 4px rgba(0,0,0,0.12), 0 12px 32px rgba(0,0,0,0.12)",
        overflow: "hidden",
        background: "#e6e6e6",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={src} width={size} height={size} style={{ objectFit: "cover", objectPosition: "50% 22%" }} />
    </div>
  );
}

const Wordmark = ({ size }: { size: number }) => (
  <div style={{ fontFamily: "Archivo Black", fontSize: size, color: RED, letterSpacing: -size * 0.03, lineHeight: 1 }}>
    Jev!
  </div>
);

const Footer = ({ sure = true }: { sure?: boolean }) => (
  <div style={{ display: "flex", fontSize: 24, color: SOFT }}>
    {sure ? "Jev’s opinion, not fact" : "From the public record"} · politiciansbyjev.vercel.app
  </div>
);

async function home() {
  const ids = [
    "abraham-lincoln", "alexandria-ocasio-cortez", "donald-trump", "barack-obama", "anthony-fauci",
    "george-washington", "nancy-pelosi", "ted-cruz", "bernie-sanders", "john-f-kennedy", "nikki-haley",
    "ronald-reagan",
  ];
  const srcs = await Promise.all(ids.map(face));
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: PAPER, padding: 72, justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Wordmark size={168} />
        <div style={{ display: "flex", flexDirection: "column", fontSize: 44, color: INK, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.2 }}>
          <span>America’s 100 most famous politicians.</span>
          <span style={{ color: SOFT }}>You ask. Jev picks.</span>
        </div>
      </div>
      <div style={{ display: "flex" }}>
        {srcs.map((src, i) => (
          <div key={i} style={{ display: "flex", marginLeft: i ? -22 : 0 }}>
            <Face src={src} size={104} ring={5} />
          </div>
        ))}
      </div>
    </div>
  );
}

function plain(question: string, line: string) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: PAPER, padding: 72, justifyContent: "space-between" }}>
      <Wordmark size={120} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {question && <div style={{ fontSize: 56, color: INK, fontWeight: 600, letterSpacing: -1.2 }}>{`“${question}”`}</div>}
        <div style={{ fontSize: 40, color: SOFT }}>{line}</div>
      </div>
      <Footer />
    </div>
  );
}

async function verdictCard(
  question: string,
  scores: Record<string, number>,
  v: NonNullable<ReturnType<typeof verdictFor>>,
  sure: boolean,
) {
  const [topId, ...rest] = v.ids;
  const top = byId.get(topId)!;
  const others = rest.slice(0, 6);
  const [topSrc, ...otherSrcs] = await Promise.all([topId, ...others].map(face));
  // The answer is the punchline, so the name outranks the question.
  const qSize = question.length > 60 ? 32 : 40;
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: PAPER, padding: 72 }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 48 }}>
        <Wordmark size={96} />
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: qSize, color: SOFT, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.2 }}>{`“${question}”`}</div>
          {others.length > 0 && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {otherSrcs.map((src, i) => (
                <div key={i} style={{ display: "flex", marginLeft: i ? -14 : 0 }}>
                  <Face src={src} size={72} ring={4} />
                </div>
              ))}
              {rest.length > others.length && (
                <div style={{ marginLeft: 16, fontSize: 28, color: SOFT }}>{`+${rest.length - others.length}`}</div>
              )}
            </div>
          )}
        </div>
        <Footer sure={sure} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 400 }}>
        <Face src={topSrc} size={300} ring={8} />
        <div style={{ marginTop: 28, fontFamily: "Archivo Black", fontSize: top.name.length > 16 ? 48 : 56, color: INK, lineHeight: 1.05, letterSpacing: -1, textAlign: "center" }}>
          {top.name}
        </div>
        <div style={{ marginTop: 12, fontSize: 30, color: SOFT }}>
          {sure ? `${v.label} · ${pct(scores[topId])}` : "On the public record"}
        </div>
      </div>
    </div>
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
    if (!a) body = plain(q, "Ask Jev. America’s 100 most famous politicians.");
    else if ("blocked" in a) body = plain("", "Jev won’t touch that one.");
    else {
      const v = verdictFor(a.scores, a.mode);
      if (v) body = await verdictCard(q, a.scores, v, a.mode !== "out");
      else if (a.mode === "strict") body = plain("", "Jev isn’t sure enough to name anyone.");
      else body = plain(q, "Jev says: nobody.");
    }
  }

  const [archivo, g400, g500, g600] = await Promise.all([
    font("archivo-black", "archivo-black-latin-400-normal.woff"),
    font("geist-sans", "geist-sans-latin-400-normal.woff"),
    font("geist-sans", "geist-sans-latin-500-normal.woff"),
    font("geist-sans", "geist-sans-latin-600-normal.woff"),
  ]);
  const root = <div style={{ display: "flex", width: "100%", height: "100%", fontFamily: "Geist" }}>{body}</div>;
  return new ImageResponse(root, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Archivo Black", data: archivo, weight: 400, style: "normal" },
      { name: "Geist", data: g400, weight: 400, style: "normal" },
      { name: "Geist", data: g500, weight: 500, style: "normal" },
      { name: "Geist", data: g600, weight: 600, style: "normal" },
    ],
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
