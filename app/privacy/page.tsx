import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Politicians by Jev keeps when you ask a question: no accounts, no cookies, and answers stored by question for 30 days.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-11-03";

export default function Privacy() {
  const h2 = "mt-10 text-lg font-semibold tracking-[-0.01em] text-ink";
  const body = "mt-3 text-base leading-relaxed text-pretty text-ink-soft";
  const link = "text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink";
  return (
    <PageShell>
      <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-ink">Privacy</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Updated <time dateTime={UPDATED}>November 3, 2026</time>
      </p>
      <p className="mt-4 text-lg leading-relaxed text-pretty text-ink">
        Politicians by Jev (Jev!) is run by Banana Intelligence. There are no accounts and no cookies. Here is
        everything that happens to what you type.
      </p>

      <h2 className={h2}>Your question</h2>
      <p className={body}>
        To answer, your question is sent to Jev, an AI model from TypeSafe AI, through Vercel AI Gateway. The
        question and Jev’s scores are then stored for 30 days, so anyone who asks the same thing gets the same
        answer. They are stored by the question’s words, not by who asked. Don’t put personal details in a question.
      </p>

      <h2 className={h2}>Counting visits</h2>
      <p className={body}>
        We use Vercel Web Analytics, which doesn’t use cookies. It counts page views without the question in the
        address, and counts asks and shares by type only, such as whether Jev answered or how a link was
        shared, never with the question text.
      </p>

      <h2 className={h2}>Server logs and limits</h2>
      <p className={body}>
        Our host, Vercel, keeps standard request logs for a short time, including IP address, time, and the
        address requested, which can include a question. Your IP address is also held briefly in memory to
        enforce the limit of 20 questions a minute.
      </p>

      <h2 className={h2}>Agents and apps</h2>
      <p className={body}>
        Questions that arrive through the JSON API, the MCP server, or an AI app that connects to it are handled
        the same way. The app you use may keep its own records under its own policy.
      </p>

      <h2 className={h2}>What we don’t do</h2>
      <p className={body}>
        No ads, no selling or sharing of data, and no profiles of visitors. The site isn’t meant for children
        under 13.
      </p>

      <h2 className={h2}>Questions</h2>
      <p className={body}>
        Open an issue on{" "}
        <a href={`${REPO_URL}/issues`} className={link}>
          GitHub
        </a>
        . See also the{" "}
        <Link href="/terms" className={link}>
          terms
        </Link>
        .
      </p>
    </PageShell>
  );
}
