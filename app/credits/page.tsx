import type { Metadata } from "next";
import Link from "next/link";
import { politicians } from "@/lib/politicians";
import Close from "./Close";

export const metadata: Metadata = { title: "Photo credits · Jev!" };

export default function Credits() {
  const sorted = [...politicians].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <main className="mx-auto max-w-2xl px-4 pb-10">
      <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-paper/95 px-4 py-3 backdrop-blur-sm">
        <Link href="/" className="font-logo text-[2rem] leading-none tracking-[-0.025em] text-jev">
          Jev!
        </Link>
        <Close />
      </header>
      <h1 className="mt-4 text-xl font-semibold">Photo credits</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Portraits come from Wikimedia Commons. Official U.S. government portraits are in the
        public domain; the rest are used under the license shown. Answers on this site are
        picked by Jev, an AI model from TypeSafe AI, and are not statements of fact.
      </p>
      <ul className="mt-6 divide-y divide-line text-sm">
        {sorted.map((p) => (
          <li key={p.id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-4">
            <a href={p.wikipedia} className="font-medium hover:underline">
              {p.name}
            </a>
            <span className="text-ink-soft sm:text-right">
              {p.imageCredit} · {p.imageLicense}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
