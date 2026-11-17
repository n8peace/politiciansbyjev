import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/app/components/PageShell";
import { getAnswer } from "@/lib/answer";
import { faceSrc, politicians } from "@/lib/politicians";
import { SITE_URL, askUrl, questionBySlug, questionPath } from "@/lib/site";
import { pct, verdictFor } from "@/lib/verdict";

type Props = { params: Promise<{ slug: string }> };

// Same freshness as /questions: answers come from the shared 30-day answer
// store, so this page costs at most one Jev call per question per day.
export const dynamic = "force-dynamic";

const byId = new Map(politicians.map((p) => [p.id, p]));

async function load(q: string) {
  const a = await getAnswer(q).catch(() => null);
  if (!a || "blocked" in a) return { v: null, scores: {} as Record<string, number>, mode: null };
  return { v: verdictFor(a.scores, a.mode), scores: a.scores, mode: a.mode };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const q = questionBySlug((await params).slug);
  if (!q) return {};
  const { v, scores, mode } = await load(q);
  const path = questionPath(q);
  const title = `Jev says: ${q}`;
  const name = (id: string) => byId.get(id)!.name;
  const description = v
    ? [
        mode !== "out" ? `${pct(scores[v.ids[0]])} sure.` : "On the public record.",
        v.ids.length > 1
          ? `Then ${v.ids.slice(1, 3).map(name).join(" and ")}${v.ids.length > 3 ? `, plus ${v.ids.length - 3} more` : ""}.`
          : "",
        "Jev scored all 100. Its opinion, not fact. Blame Jev.",
      ]
        .filter(Boolean)
        .join(" ")
    : "Jev’s answer to a question people ask a lot, scored across 100 famous US politicians. Jev’s opinion, not fact.";
  const image = `/og?q=${encodeURIComponent(q)}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    // A page with no answer is thin; keep it out of search until Jev answers.
    ...(v ? {} : { robots: { index: false, follow: true } }),
    openGraph: { siteName: "Jev!", type: "website", locale: "en_US", url: path, title, description, images: [{ url: image, width: 1200, height: 630, alt: `Jev! “${q}”` }] },
    twitter: { card: "summary_large_image", title, description, images: [{ url: image, alt: `Jev! “${q}”` }] },
  };
}

export default async function QuestionPage({ params }: Props) {
  const q = questionBySlug((await params).slug);
  if (!q) notFound();
  const { v, scores } = await load(q);
  const top = v ? byId.get(v.ids[0]) : null;
  const next = v ? v.ids.slice(1, 4).map((id) => byId.get(id)!) : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Jev says: ${q}`,
    url: `${SITE_URL}${questionPath(q)}`,
    isPartOf: { "@type": "WebSite", name: "Jev!", url: SITE_URL },
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-sm text-ink-soft">
        <Link href="/questions" className="inline-flex min-h-11 items-center underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
          What Jev says
        </Link>
      </p>
      <h1 className="mt-2 text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-balance text-ink">“{q}”</h1>

      <div className="mt-8 flex items-center gap-4">
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
        <div className="min-w-0 flex-1">
          {top && v ? (
            <>
              <p className="text-sm text-ink-soft">{v.label}</p>
              <p className="mt-1 text-xl font-semibold tracking-[-0.01em] text-ink">
                {top.name} <span className="font-normal text-ink-soft">{pct(scores[top.id])}</span>
              </p>
            </>
          ) : (
            <p className="text-xl font-semibold text-ink">Jev says: nobody</p>
          )}
          {next.length > 0 && (
            <p className="mt-1 text-sm text-ink-soft">Then {next.map((n) => `${n.name} ${pct(scores[n.id])}`).join(", ")}</p>
          )}
        </div>
      </div>

      <p className="mt-6 text-base leading-relaxed text-pretty text-ink-soft">
        Scored across all 100 politicians by Jev. Jev’s opinion, not fact.{" "}
        <Link href="/how-it-works" className="text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
          How it works
        </Link>
        .
      </p>

      <Link
        href={askUrl(q).replace(SITE_URL, "")}
        className="mt-8 inline-flex min-h-11 items-center rounded-full bg-jev px-6 text-base font-semibold text-white hover:opacity-90"
      >
        Play with this question
      </Link>
    </PageShell>
  );
}
