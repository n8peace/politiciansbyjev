import type { Metadata } from "next";
import Pile from "@/app/components/Pile";
import { politicians, faceSrc } from "@/lib/politicians";

// A shared link (?q=...) gets a share card showing Jev's answer.
export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 140);
  if (!q) return {};
  const title = `“${q}” · Jev!`;
  const image = { url: `/og?q=${encodeURIComponent(q)}`, width: 1200, height: 630, alt: `Jev's answer to “${q}”` };
  return {
    title,
    openGraph: { title, images: [image] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export default function Home() {
  const faces = politicians.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    img: faceSrc(p.id),
  }));
  return <Pile faces={faces} />;
}
