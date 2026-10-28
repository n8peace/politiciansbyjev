import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import { politicians } from "@/lib/politicians";
import { JEV_URL, REPO_URL, SITE_URL } from "@/lib/site";
import { GUESS_FLOOR, LIKELY, STRICT, SURE } from "@/lib/verdict";

const TITLE = "How Jev! works: a Jev model demo, with code";
const DESCRIPTION =
  "How Jev!, an open-source demo of TypeSafe AI’s Jev model, turns one question into 100 yes/no calls, what the thresholds mean, the guardrails on accusations, and the code.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/how-it-works", images: "/og" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: "/og" },
};

const p = (n: number) => `${Math.round(n * 100)}%`;
const current = politicians.filter((x) => x.era === "current");
const count = (party: string) => current.filter((x) => x.party === party).length;

const FAQ: [string, string][] = [
  [
    "What is Jev?",
    "Jev is TypeSafe AI’s “System One” decision model, available on Vercel AI Gateway. It doesn’t write text. You give it a situation and typed questions (yes/no, multiple choice, or a score), and it answers each one with probabilities, usually in well under a second.",
  ],
  [
    "Is Jev! biased?",
    "Jev! has no opinions of its own; every pick comes from Jev, scored the same way for all 100 people. The list is balanced by party, and the site adds no weighting. Jev still reflects patterns in what it learned, so treat answers as one model’s read, not a fact. That’s the joke: blame Jev.",
  ],
  [
    "Who picked the 100 politicians?",
    `We did, by name recognition among ordinary Americans, not by importance: ${current.length} current figures and ${politicians.length - current.length} historic ones. Among current figures, ${count("R")} are Republicans and ${count("D")} are Democrats.`,
  ],
  [
    "Why won’t it answer some questions?",
    `Questions that accuse real people of abuse, or guess at private traits like sexuality or health, are refused. Questions about crimes or bigotry only name people Jev rates at ${p(STRICT)} or higher. A confident wrong answer about a real person can do real harm.`,
  ],
  [
    "How much does a question cost?",
    "About $0.00024 in Jev calls. The same question asked again within a day reuses the saved answer, so repeat asks and shared links are free.",
  ],
  [
    "Can I build something like this?",
    "Yes. The code is open source under the MIT license, and the core is one AI SDK call. See the snippet above or the GitHub repo.",
  ],
];

const SNIPPET = `import { experimental_evaluate as evaluate } from "ai";

// One question, 100 yes/no judgments (sent as 4 parallel calls of 25).
const result = await evaluate({
  model: "typesafe-ai/jev",
  state: {
    task: "A visitor asked a question about famous US politicians.",
    question: "Best president ever",
  },
  questions: {
    "abraham-lincoln": {
      type: "boolean",
      instructions:
        "Is Abraham Lincoln (16th President, 1861–1865) one of the answers to the visitor's question?",
    },
    // ...99 more, one per person
  },
});

result.answers["abraham-lincoln"].probability; // 0.94`;

export default function HowItWorks() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: TITLE,
      description: DESCRIPTION,
      url: `${SITE_URL}/how-it-works`,
      about: { "@type": "SoftwareApplication", name: "Jev", applicationCategory: "AI model", url: JEV_URL },
      isPartOf: { "@type": "WebSite", name: "Jev!", url: SITE_URL },
    },
  ];

  const h2 = "mt-12 text-xl font-semibold tracking-[-0.01em] text-ink";
  const body = "mt-3 text-base leading-relaxed text-pretty text-ink-soft";
  const link = "text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink";

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-balance text-ink">
        How Jev! works
      </h1>
      <p className="mt-4 text-xl leading-relaxed text-pretty text-ink">
        Jev! is a small, open-source test of{" "}
        <a href={JEV_URL} className={link}>
          Jev
        </a>
        , the decision model from TypeSafe AI. Every question you ask becomes 100 yes/no calls, one per
        politician, answered in under a second.
      </p>

      <h2 className={h2}>1. The pile</h2>
      <p className={body}>
        {politicians.length} of America’s most famous politicians: {current.length} current and{" "}
        {politicians.length - current.length} historic, picked by name recognition, not importance. Among
        current figures, {count("R")} are Republicans and {count("D")} are Democrats. Portraits come from
        Wikimedia Commons (
        <Link href="/credits" className={link}>
          credits
        </Link>
        ).
      </p>

      <h2 className={h2}>2. One question, 100 judgments</h2>
      <p className={body}>
        Jev doesn’t write answers. It takes a situation and typed questions, and returns a probability for
        each. So your question goes to Jev once, alongside 100 yes/no questions: “Is Abraham Lincoln (16th
        President, 1861–1865) one of the answers?” Each person gets their own score from 0 to 100%,
        independent of everyone else. That’s why a question can have one answer, a crowd, or nobody.
      </p>

      <h2 className={h2}>3. Who floats up</h2>
      <ul className="mt-3 space-y-2 text-base text-ink-soft">
        <li>
          <span className="font-medium text-ink">{p(SURE)} or higher:</span> Jev is sure.
        </li>
        <li>
          <span className="font-medium text-ink">
            {p(LIKELY)} to {p(SURE)}:
          </span>{" "}
          Jev thinks so.
        </li>
        <li>
          <span className="font-medium text-ink">Nobody at {p(LIKELY)}:</span> the top three at{" "}
          {p(GUESS_FLOOR)} or higher float up as Jev’s best guess.
        </li>
        <li>
          <span className="font-medium text-ink">Below that:</span> Jev says nobody.
        </li>
      </ul>
      <p className={body}>
        The highest score becomes the top pick. Everyone who missed turns gray in the pile.
      </p>

      <h2 className={h2}>4. Guardrails</h2>
      <p className={body}>
        Before answering, Jev sorts the question itself: opinion, public fact, crime, bigotry, abuse,
        private trait, or public record.
      </p>
      <ul className="mt-3 space-y-2 text-base text-ink-soft">
        <li>
          <span className="font-medium text-ink">Opinions and facts</span> use the thresholds above.
        </li>
        <li>
          <span className="font-medium text-ink">Crime and bigotry</span> only name people Jev rates at{" "}
          {p(STRICT)} or higher. Lower scores never leave the server.
        </li>
        <li>
          <span className="font-medium text-ink">Abuse and private traits</span> (sexuality, health,
          religion) are refused.
        </li>
        <li>
          <span className="font-medium text-ink">“Who’s openly gay?”</span> is answered only from people who
          have said so publicly. Left alone, Jev rated two politicians who are not publicly out at 88 to 89%.
        </li>
      </ul>
      <p className={body}>
        We tested the sorting against 91 tricky questions (rewordings, slang, other languages, “just
        hypothetically”). One slipped through; no normal question was wrongly refused.
      </p>

      <h2 className={h2}>5. What it isn’t</h2>
      <p className={body}>
        Not a fact-check, not a poll, and not our opinion. It’s one model’s read on a question, shown
        honestly with its confidence. If you don’t like the answer, blame Jev.
      </p>

      <h2 className={h2}>6. The code</h2>
      <p className={body}>
        The core is one{" "}
        <a href="https://ai-sdk.dev" className={link}>
          AI SDK
        </a>{" "}
        call through Vercel AI Gateway. No API key is needed on Vercel; it signs in with the project’s
        OIDC token. Same question, same answer for a day, so a link that gets passed around costs one call.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-2xl border border-line bg-ink p-4 text-sm leading-relaxed text-paper">
        <code>{SNIPPET}</code>
      </pre>
      <p className={body}>
        Full source, MIT licensed:{" "}
        <a href={REPO_URL} className={link}>
          github.com/n8peace/politiciansbyjev
        </a>
        .
      </p>

      <h2 className={h2}>Questions</h2>
      <dl className="mt-3 divide-y divide-line">
        {FAQ.map(([q, a]) => (
          <div key={q} className="py-4">
            <dt className="text-base font-medium text-ink">{q}</dt>
            <dd className="mt-1 text-base leading-relaxed text-pretty text-ink-soft">{a}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-12">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full bg-jev px-6 text-base font-medium text-paper transition-transform duration-150 active:scale-[0.97]"
        >
          Ask Jev something
        </Link>
      </p>
    </PageShell>
  );
}
