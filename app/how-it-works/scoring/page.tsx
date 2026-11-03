import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import { politicians } from "@/lib/politicians";
import { JEV_URL, SITE_URL, askUrl } from "@/lib/site";
import { GUESS_COUNT, GUESS_FLOOR, LIKELY, STRICT, SURE, TIE } from "@/lib/verdict";

const TITLE = "How Jev scores a question: 100 yes/no calls and three bars";
const DESCRIPTION =
  "The method behind Jev!: one yes/no question per politician, what the probabilities mean, the 80% and 55% bars, and which questions Jev refuses.";
const PATH = "/how-it-works/scoring";
const PUBLISHED = "2026-11-03";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "article", title: TITLE, description: DESCRIPTION, url: PATH, images: "/og" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: "/og" },
};

const p = (n: number) => `${Math.round(n * 100)}%`;

// Snapshots of stored production answers, read 2026-11-03. Stored answers
// last 30 days, so the live numbers can move a point after that.
const BEST: [string, number][] = [
  ["Abraham Lincoln", 0.94],
  ["George Washington", 0.9],
  ["Franklin D. Roosevelt", 0.89],
  ["Thomas Jefferson", 0.85],
  ["Ronald Reagan", 0.85],
];
const ZOMBIE: [string, number][] = [
  ["Theodore Roosevelt", 0.66],
  ["Joe Biden", 0.57],
  ["Barack Obama", 0.56],
  ["Hillary Clinton", 0.56],
  ["Anthony Fauci", 0.56],
  ["Donald Trump", 0.55],
  ["Kamala Harris", 0.55],
];

export default function Scoring() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}${PATH}`,
    mainEntityOfPage: `${SITE_URL}${PATH}`,
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    author: { "@type": "Organization", name: "Banana Intelligence", url: "https://bananaintelligence.ai" },
    publisher: { "@type": "Organization", name: "Banana Intelligence", url: "https://bananaintelligence.ai" },
    image: `${SITE_URL}/og`,
    about: { "@type": "SoftwareApplication", name: "Jev", applicationCategory: "AI model", url: JEV_URL },
    isPartOf: { "@type": "WebSite", name: "Jev!", url: SITE_URL },
  };

  const h2 = "mt-12 text-xl font-semibold tracking-[-0.01em] text-ink";
  const body = "mt-3 text-base leading-relaxed text-pretty text-ink-soft";
  const link = "text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink";
  const em = "font-medium text-ink";

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-sm text-ink-soft">
        <Link href="/how-it-works" className={link}>
          How it works
        </Link>{" "}
        · Method · <time dateTime={PUBLISHED}>November 3, 2026</time>
      </p>
      <h1 className="mt-3 text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-balance text-ink">
        How Jev scores a question
      </h1>
      <p className="mt-4 text-xl leading-relaxed text-pretty text-ink">
        Every answer on Jev! comes from{" "}
        <a href={JEV_URL} className={link}>
          Jev
        </a>
        , the decision model from TypeSafe AI. Jev doesn’t write text. It answers typed questions with
        probabilities. Here is exactly what we ask it, what the numbers mean, and where we draw the lines.
      </p>

      <h2 className={h2}>One yes/no question per politician</h2>
      <p className={body}>
        Your question goes to Jev with {politicians.length} yes/no questions attached, one per person, in this
        form: “Is Abraham Lincoln (16th President, 1861–1865) one of the answers to the visitor’s question?”
        The role and years are there so Jev knows which Roosevelt or which Bush we mean. Jev is told to judge
        each person on their own. The {politicians.length} go out as four calls of 25 that run at the same
        time, and the whole answer usually comes back in under a second.
      </p>

      <h2 className={h2}>What the probabilities mean</h2>
      <p className={body}>
        Each person gets a probability from 0 to 100% that the answer for them is yes. These are not shares
        of a vote, and they don’t add up to 100. On “Best president ever,” eight people score 80% or more.
        Typing nonsense like “asdfgh” tops out near 26%, which is why we treat anything under{" "}
        {p(GUESS_FLOOR)} as noise.
      </p>
      <p className={body}>
        Jev can drift a point or so if you ask the same thing twice. So each question’s answer is stored for
        30 days, and the page, the share link, the share card, and the{" "}
        <Link href="/how-it-works#agents" className={link}>
          agent API
        </Link>{" "}
        all read that one copy. A link you send shows your friend the same numbers you saw.
      </p>

      <h2 className={h2}>The bars</h2>
      <ul className="mt-3 space-y-2 text-base text-ink-soft">
        <li>
          <span className={em}>{p(SURE)} or higher:</span> “Jev is sure.”
        </li>
        <li>
          <span className={em}>
            {p(LIKELY)} to {p(SURE)}:
          </span>{" "}
          “Jev thinks so.” More likely yes than no, with a margin.
        </li>
        <li>
          <span className={em}>Nobody at {p(LIKELY)}:</span> up to {GUESS_COUNT} people at {p(GUESS_FLOOR)} or
          higher are shown as “Jev’s best guess.”
        </li>
        <li>
          <span className={em}>Nobody at {p(GUESS_FLOOR)}:</span> Jev says nobody.
        </li>
        <li>
          <span className={em}>Within {Math.round(TIE * 100)} points of the top:</span> the runner-up is
          called out as a near tie.
        </li>
      </ul>
      <p className={body}>
        The label always describes the top pick. Everyone who clears the bar floats out of the pile, best
        first, and the rest pour into the weigh-in chart in gray.
      </p>

      <h2 className={h2}>Two real answers</h2>
      <p className={body}>
        Read from the live site on November 3, 2026.{" "}
        <a href={askUrl("Best president ever")} className={link}>
          “Best president ever”
        </a>{" "}
        is a sure answer with a crowd behind it:
      </p>
      <Scores rows={BEST} />
      <p className={body}>
        <a href={askUrl("Who would survive a zombie apocalypse?")} className={link}>
          “Who would survive a zombie apocalypse?”
        </a>{" "}
        is the opposite shape. Nobody reaches {p(SURE)}, so the label is “Jev thinks so,” and Theodore
        Roosevelt stands alone in the 60s with six people bunched just over the {p(LIKELY)} line:
      </p>
      <Scores rows={ZOMBIE} />
      <p className={body}>
        Same method, same bars. The difference is how sure Jev is, and the page says so instead of hiding it.
      </p>

      <h2 className={h2}>What gets refused</h2>
      <p className={body}>
        Before scoring, Jev sorts the question into one of seven kinds: opinion, public fact, publicly out,
        crime, bigotry, abuse, or private trait. It may be in any language or dressed up as a joke or a
        hypothetical. The kind sets the rule:
      </p>
      <ul className="mt-3 space-y-2 text-base text-ink-soft">
        <li>
          <span className={em}>Opinion and public fact</span> use the bars above.
        </li>
        <li>
          <span className={em}>Crime and bigotry</span> only name people Jev rates at {p(STRICT)} or higher.
          Lower scores are dropped on the server and never reach the page, so hovering a face can’t reveal a
          weak accusation.
        </li>
        <li>
          <span className={em}>Abuse and private traits</span> (sexuality, health, religion) are refused
          outright. Left alone, Jev rated a governor who is not publicly out at 86% on “who is gay,” and a confident wrong answer about a
          real person does real harm.
        </li>
        <li>
          <span className={em}>“Who is openly gay?”</span> is answered only from people who have said so
          publicly, from a list we checked by hand.
        </li>
      </ul>
      <p className={body}>
        We tuned the sorting against 91 tricky questions: rewordings, slang, other languages, and “just
        hypothetically.” One slipped through and no normal question was wrongly refused.
      </p>

      <h2 className={h2}>What this is not</h2>
      <p className={body}>
        Not a poll, not a fact-check, and not our opinion. It is one model’s read, shown with its confidence.
        The code is open, so you can check every line of this page against it.
      </p>

      <p className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full bg-jev px-6 text-base font-medium text-paper transition-transform duration-150 active:scale-[0.97]"
        >
          Ask Jev something
        </Link>
        <Link
          href="/releases"
          className="inline-flex h-11 items-center rounded-full px-4 text-base font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
        >
          Release log
        </Link>
      </p>
    </PageShell>
  );
}

function Scores({ rows }: { rows: [string, number][] }) {
  return (
    <table className="mt-4 w-full text-base">
      <tbody className="divide-y divide-line">
        {rows.map(([name, v]) => (
          <tr key={name}>
            <td className="py-2 text-ink">{name}</td>
            <td className="w-1/2 py-2">
              <span className="flex items-center gap-3">
                <span className="h-2 flex-1 rounded-full bg-ink/5">
                  <span
                    className={`block h-2 rounded-full ${v >= SURE ? "bg-jev" : "bg-ink/40"}`}
                    style={{ width: `${v * 100}%` }}
                  />
                </span>
                <span className="w-10 text-right tabular-nums text-ink">{p(v)}</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
