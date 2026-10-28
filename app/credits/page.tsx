import type { Metadata } from "next";
import PageShell from "@/app/components/PageShell";
import { politicians } from "@/lib/politicians";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Where every portrait in Jev! comes from: Wikimedia Commons, with author and license for all 100.",
  alternates: { canonical: "/credits" },
};

export default function Credits() {
  const sorted = [...politicians].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-[-0.01em]">Photo credits</h1>
      <p className="mt-3 text-base text-pretty text-ink-soft">
        Portraits come from Wikimedia Commons. Official U.S. government portraits are in the public
        domain; the rest are used under the license shown. Answers on this site are picked by Jev, an AI
        model from TypeSafe AI, and are not statements of fact.
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
    </PageShell>
  );
}
