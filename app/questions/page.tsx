import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import { getAnswer } from "@/lib/answer";
import { faceSrc, politicians } from "@/lib/politicians";
import { INDEXED, SITE_URL, askUrl } from "@/lib/site";
import { pct, verdictFor } from "@/lib/verdict";

const TITLE = "What Jev says about America’s politicians";
const DESCRIPTION =
  "Jev’s answers to the questions people ask most: best president, who’d win a fistfight, the best hair, and more. Each one scored across 100 famous US politicians by TypeSafe AI’s Jev model.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/questions" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/questions", images: "/og" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: "/og" },
};

// Answers come from the shared one-a-day cache, so this page costs at most
// one Jev call per question per day.
export const dynamic = "force-dynamic";

const byId = new Map(politicians.map((p) => [p.id, p]));

export default async function Questions() {
  const rows = await Promise.all(
    INDEXED.map(async (q) => {
      const a = await getAnswer(q).catch(() => null);
      if (!a || "blocked" in a) return { q, v: null, scores: {} as Record<string, number> };
      return { q, v: verdictFor(a.scores, a.mode), scores: a.scores };
    }),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    itemListElement: rows.map(({ q, v, scores }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: askUrl(q),
      name: v ? `${q}: ${byId.get(v.ids[0])!.name} (${pct(scores[v.ids[0]])})` : q,
    })),
    isPartOf: { "@type": "WebSite", name: "Jev!", url: SITE_URL },
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-balance text-ink">
        What Jev says
      </h1>
      <p className="mt-4 text-base leading-relaxed text-pretty text-ink-soft">
        The questions people ask most, each scored across all 100 politicians by Jev. Jev’s opinion, not
        fact.{" "}
        <Link href="/how-it-works" className="text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
          How it works
        </Link>
        .
      </p>

      <ol className="mt-8 divide-y divide-line">
        {rows.map(({ q, v, scores }) => {
          const top = v ? byId.get(v.ids[0]) : null;
          const next = v ? v.ids.slice(1, 4).map((id) => byId.get(id)!) : [];
          return (
            <li key={q}>
              <Link href={`/?q=${encodeURIComponent(q)}`} className="group flex items-center gap-4 py-5">
                {top ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={faceSrc(top.id)}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-paper shadow-[0_1px_2px_rgba(0,0,0,0.18),0_4px_10px_rgba(0,0,0,0.10)]"
                    style={{ objectPosition: "50% 22%" }}
                  />
                ) : (
                  <span aria-hidden className="h-16 w-16 shrink-0 rounded-full bg-line" />
                )}
                <span className="min-w-0 flex-1">
                  <h2 className="text-base text-ink-soft">“{q}”</h2>
                  {top && v ? (
                    <p className="mt-1 text-xl font-semibold tracking-[-0.01em] text-ink">
                      {top.name} <span className="font-normal text-ink-soft">{pct(scores[top.id])}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-xl font-semibold text-ink">Jev says: nobody</p>
                  )}
                  {next.length > 0 && (
                    <p className="mt-1 truncate text-sm text-ink-soft">
                      Then {next.map((n) => `${n.name} ${pct(scores[n.id])}`).join(", ")}
                    </p>
                  )}
                </span>
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  className="shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5"
                >
                  <path d="M6 3.5l4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          );
        })}
      </ol>
    </PageShell>
  );
}
