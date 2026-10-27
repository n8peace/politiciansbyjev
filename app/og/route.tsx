import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { answer, cached } from "@/lib/answer";
import { clientIp, limited } from "@/lib/limit";
import { politicians } from "@/lib/politicians";
import { groupAnswer, namedCount, type Answer } from "@/lib/tiers";

// The share card for a question: 1200x630, the same answer the asker saw.
// Link previews (X, iMessage, Slack) fetch this once; the CDN keeps it.

export const maxDuration = 30;

const INK = "#151515";
const SOFT = "#5b5b5b";
const FAINT = "#9a9a9a";
const RED = "#e1261c";
const LINE = "#e6e6e6";
const HOST = "politiciansbyjev.vercel.app";

const asset = (f: string) => readFile(join(process.cwd(), "assets", f));
const fonts = Promise.all([
  asset("ArchivoBlack-Regular.ttf"),
  asset("Geist-Regular.ttf"),
  asset("Geist-SemiBold.ttf"),
]);

const byId = new Map(politicians.map((p) => [p.id, p]));
const faceCache = new Map<string, string>();
async function face(id: string) {
  let src = faceCache.get(id);
  if (!src) {
    const buf = await readFile(join(process.cwd(), "public", "faces", `${id}.jpg`));
    src = `data:image/jpeg;base64,${buf.toString("base64")}`;
    faceCache.set(id, src);
  }
  return src;
}

const pct = (v: number | undefined) => `${Math.round((v ?? 0) * 100)}%`;

function Face({ src, size, faded }: { src: string; size: number; faded?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      style={{
        width: size,
        height: size,
        borderRadius: size,
        objectFit: "cover",
        objectPosition: "50% 22%",
        border: `${Math.max(3, size / 40)}px solid white`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
        opacity: faded ? 0.5 : 1,
      }}
    />
  );
}

function Frame({ children, question }: { children: React.ReactNode; question?: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "white",
        padding: "56px 64px 48px",
        fontFamily: "Geist",
        color: INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Archivo Black", fontSize: 64, color: RED, letterSpacing: -2, lineHeight: 1 }}>
          Jev!
        </div>
        <div style={{ fontSize: 24, color: FAINT }}>{HOST}</div>
      </div>
      {question && (
        <div
          style={{
            marginTop: 28,
            fontSize: question.length > 60 ? 40 : 52,
            fontWeight: 600,
            letterSpacing: -1,
            lineHeight: 1.15,
            maxHeight: 128,
            overflow: "hidden",
          }}
        >
          {`“${question}”`}
        </div>
      )}
      <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>{children}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 24,
          paddingTop: 20,
          borderTop: `1px solid ${LINE}`,
          fontSize: 22,
          color: FAINT,
        }}
      >
        <div>Jev&apos;s opinion, not fact.</div>
        <div style={{ color: SOFT }}>Ask Jev your own</div>
      </div>
    </div>
  );
}

async function Home() {
  // A loose pile of familiar faces along the bottom.
  const ids = [
    "abraham-lincoln", "barack-obama", "ronald-reagan", "john-f-kennedy", "donald-trump",
    "alexandria-ocasio-cortez", "theodore-roosevelt", "bernie-sanders", "george-washington",
    "kamala-harris", "benjamin-franklin", "nancy-pelosi", "jd-vance", "bill-clinton",
  ];
  const srcs = await Promise.all(ids.map(face));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "white",
        fontFamily: "Geist",
        position: "relative",
      }}
    >
      <div
        style={{
          marginTop: 70,
          fontFamily: "Archivo Black",
          fontSize: 200,
          color: RED,
          letterSpacing: -6,
          lineHeight: 1,
        }}
      >
        Jev!
      </div>
      <div style={{ marginTop: 20, fontSize: 34, color: SOFT }}>
        America&apos;s 100 most famous politicians. You ask. An AI picks.
      </div>
      {srcs.map((src, i) => {
        const row = i % 2;
        const x = -30 + Math.floor(i / 2) * 178 + row * 89;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: 470 - row * 66, display: "flex" }}>
            <Face src={src} size={150} />
          </div>
        );
      })}
    </div>
  );
}

async function Result({ question, a }: { question: string; a: Exclude<Answer, { blocked: true }> }) {
  const { tiers, shown } = groupAnswer(a);
  const named = namedCount(a);

  if (!tiers.length) {
    return (
      <Frame question={question}>
        <div style={{ fontSize: 44, color: SOFT, display: "flex" }}>
          {a.mode === "strict" ? "Jev isn't 90% sure about anyone." : "Jev says: nobody."}
        </div>
      </Frame>
    );
  }

  const hero = tiers.find((t) => t.key === "pick");
  if (hero) {
    const close = tiers.find((t) => t.key === "close")?.ids.slice(0, 3) ?? [];
    const bottom = tiers.find((t) => t.key === "bottom")?.ids[0];
    const big = hero.ids.length === 1 ? 210 : 150;
    const heroSrcs = await Promise.all(hero.ids.map(face));
    const closeSrcs = await Promise.all(close.map(face));
    const bottomSrc = bottom ? await face(bottom) : null;
    return (
      <Frame question={question}>
        <div style={{ display: "flex", width: "100%", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {heroSrcs.map((src, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 28 }}>
                <Face src={src} size={big} />
                {hero.ids.length === 1 && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 26, color: SOFT }}>{hero.label}</div>
                    <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.05, maxWidth: 520 }}>
                      {byId.get(hero.ids[0])?.name}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 40, fontWeight: 600, color: RED }}>
                      {pct(shown[hero.ids[0]])}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 18 }}>
            {close.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                <div style={{ fontSize: 22, color: SOFT }}>Close behind</div>
                <div style={{ display: "flex", gap: 12 }}>
                  {closeSrcs.map((src, i) => (
                    <Face key={i} src={src} size={84} />
                  ))}
                </div>
              </div>
            )}
            {bottomSrc && bottom && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ fontSize: 22, color: SOFT }}>Bottom of the pile</div>
                  <div style={{ fontSize: 26, fontWeight: 600 }}>{byId.get(bottom)?.name}</div>
                </div>
                <Face src={bottomSrc} size={72} faded />
              </div>
            )}
          </div>
        </div>
      </Frame>
    );
  }

  // Everyone who fits: a row of faces, the first ones named.
  const ids = tiers.flatMap((t) => t.ids);
  const shownIds = ids.slice(0, 7);
  const srcs = await Promise.all(shownIds.map(face));
  const more = (named ?? ids.length) - shownIds.length;
  return (
    <Frame question={question}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 26, color: SOFT }}>{tiers[0].label}</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
          {srcs.map((src, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 132 }}>
              <Face src={src} size={120} />
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 600, textAlign: "center", lineHeight: 1.15 }}>
                {byId.get(shownIds[i])?.name}
              </div>
            </div>
          ))}
          {more > 0 && (
            <div style={{ display: "flex", height: 120, alignItems: "center", fontSize: 30, color: SOFT }}>
              +{more} more
            </div>
          )}
        </div>
      </div>
    </Frame>
  );
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 140) ?? "";
  const [archivo, regular, semibold] = await fonts;
  const options = (maxAge: number) => ({
    width: 1200,
    height: 630,
    fonts: [
      { name: "Archivo Black", data: archivo, weight: 400 as const, style: "normal" as const },
      { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
    ],
    headers: { "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge * 24}, stale-while-revalidate=86400` },
  });

  let a: Answer | undefined;
  if (q) {
    a = cached(q);
    if (!a && !limited(`og:${clientIp(req)}`, 60)) {
      a = await answer(q).catch(() => undefined);
    }
  }
  if (!q || !a || "blocked" in a) {
    // No question, Jev won't answer it, or Jev is down: the plain card.
    return new ImageResponse(await Home(), options(q ? 300 : 3600));
  }
  return new ImageResponse(await Result({ question: q, a }), options(3600));
}
