import type { Metadata } from "next";
import Pile from "@/app/components/Pile";
import { getAnswer, MAX_LEN } from "@/lib/answer";
import { politicians, faceSrc } from "@/lib/politicians";
import { verdictFor } from "@/lib/verdict";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

const DESCRIPTION = "America’s 100 most famous politicians. You ask. Jev picks. Blame Jev.";

// A shared link (?q=...) unfurls with that question's verdict card. The
// question text only shows when Jev actually answered it.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, MAX_LEN);
  if (!q) return { openGraph: { images: "/og" }, twitter: { card: "summary_large_image", images: "/og" } };

  const a = await getAnswer(q).catch(() => null);
  const named = a && !("blocked" in a) && verdictFor(a.scores, a.mode);
  const title = named ? `“${q}” · Jev!` : "Jev! · Politicians by Jev";
  const image = `/og?q=${encodeURIComponent(q)}`;
  return {
    title,
    openGraph: { title, description: DESCRIPTION, images: image },
    twitter: { card: "summary_large_image", title, description: DESCRIPTION, images: image },
  };
}

export default async function Home({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, MAX_LEN) ?? "";
  const faces = politicians.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    img: faceSrc(p.id),
  }));
  return <Pile faces={faces} initialQuestion={q} />;
}
