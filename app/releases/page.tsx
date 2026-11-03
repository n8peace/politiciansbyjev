import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import { LATEST, RELEASES } from "@/lib/releases";
import { JEV_URL, SITE_URL } from "@/lib/site";

const TITLE = "Jev! release log: what shipped and why";
const DESCRIPTION =
  "Every feature that went live on Jev!, the open-source demo of TypeSafe AI’s Jev model, with the date it shipped and the reason for it.";
const PATH = "/releases";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "article", title: TITLE, description: DESCRIPTION, url: PATH, images: "/og" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: "/og" },
};

const day = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function Releases() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}${PATH}`,
    mainEntityOfPage: `${SITE_URL}${PATH}`,
    datePublished: RELEASES[RELEASES.length - 1].date,
    dateModified: LATEST,
    author: { "@type": "Organization", name: "Banana Intelligence", url: "https://bananaintelligence.ai" },
    publisher: { "@type": "Organization", name: "Banana Intelligence", url: "https://bananaintelligence.ai" },
    image: `${SITE_URL}/og`,
    about: { "@type": "SoftwareApplication", name: "Jev", applicationCategory: "AI model", url: JEV_URL },
    isPartOf: { "@type": "WebSite", name: "Jev!", url: SITE_URL },
  };

  const link = "text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink";

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-balance text-ink">Release log</h1>
      <p className="mt-4 text-xl leading-relaxed text-pretty text-ink">
        What went live on Jev!, newest first, and why. Every answer comes from{" "}
        <a href={JEV_URL} className={link}>
          Jev
        </a>
        , TypeSafe AI’s decision model; this log covers the site around it. The method is on{" "}
        <Link href="/how-it-works/scoring" className={link}>
          how Jev scores a question
        </Link>
        .
      </p>

      <ol className="mt-10 divide-y divide-line border-t border-line">
        {RELEASES.map((r) => (
          <li key={r.slug} id={r.slug} className="scroll-mt-20 py-8">
            <p className="text-sm text-ink-soft">
              <time dateTime={r.date}>{day(r.date)}</time>
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em] text-ink">
              <a href={`#${r.slug}`} className="hover:underline hover:decoration-ink/30 hover:underline-offset-4">
                {r.title}
              </a>
            </h2>
            <p className="mt-3 text-base leading-relaxed text-pretty text-ink">{r.what}</p>
            <p className="mt-3 text-base leading-relaxed text-pretty text-ink-soft">
              <span className="font-medium text-ink">Why: </span>
              {r.why}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm text-ink-soft">
        Every change is in the open on{" "}
        <a href="https://github.com/n8peace/politiciansbyjev/commits/main" className={link}>
          GitHub
        </a>
        .
      </p>
    </PageShell>
  );
}
