import type { Metadata } from "next";
import Pile from "@/app/components/Pile";
import { getAnswer, MAX_LEN } from "@/lib/answer";
import { politicians, faceSrc, faceSmallSrc } from "@/lib/politicians";
import { pct, verdictFor } from "@/lib/verdict";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

// A shared link (?q=...) unfurls with that question's verdict card, a title
// that names the answer, and a description with the runners-up. The question
// text only shows when Jev actually answered it.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, MAX_LEN);
  if (!q) return {};

  const a = await getAnswer(q).catch(() => null);
  const answered = a && !("blocked" in a) ? a : null;
  const v = answered ? verdictFor(answered.scores, answered.mode) : null;
  const name = (id: string) => politicians.find((p) => p.id === id)!.name;
  const image = `/og?q=${encodeURIComponent(q)}`;
  const url = `/?q=${encodeURIComponent(q)}`;

  if (!answered || !v) {
    // Refusals and empty answers share the generic card and stay out of search.
    return { robots: { index: false, follow: true }, openGraph: { images: image }, twitter: { images: image } };
  }

  const top = name(v.ids[0]);
  const sure = answered.mode !== "out";
  const title = `Jev says ${top}: “${q}”`;
  const runners = v.ids.slice(1, 3).map(name);
  const description = [
    sure ? `${pct(answered.scores[v.ids[0]])} sure.` : "On the public record.",
    runners.length ? `Then ${runners.join(" and ")}${v.ids.length > 3 ? `, plus ${v.ids.length - 3} more` : ""}.` : "",
    "Jev scored all 100 of America’s most famous politicians. Jev’s opinion, not fact. Blame Jev.",
  ]
    .filter(Boolean)
    .join(" ");
  const alt = `Jev! “${q}” Jev picks ${top}${sure ? `, ${pct(answered.scores[v.ids[0]])} sure` : ""}.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      siteName: "Jev!",
      type: "website",
      locale: "en_US",
      url,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt }],
    },
    twitter: { card: "summary_large_image", title, description, images: [{ url: image, alt }] },
  };
}

export default async function Home({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, MAX_LEN) ?? "";
  const faces = politicians.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    img: faceSmallSrc(p.id),
    big: faceSrc(p.id),
  }));
  return <Pile faces={faces} initialQuestion={q} />;
}
