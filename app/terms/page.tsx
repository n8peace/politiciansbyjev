import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Politicians by Jev: a free entertainment demo whose answers are an AI model's opinion, not fact.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "2026-11-03";

export default function Terms() {
  const h2 = "mt-10 text-lg font-semibold tracking-[-0.01em] text-ink";
  const body = "mt-3 text-base leading-relaxed text-pretty text-ink-soft";
  const link = "text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink";
  return (
    <PageShell>
      <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-ink">Terms</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Updated <time dateTime={UPDATED}>November 3, 2026</time>
      </p>
      <p className="mt-4 text-lg leading-relaxed text-pretty text-ink">
        Politicians by Jev (Jev!) is a free demo run by Banana Intelligence. By using the site, its JSON API,
        or its MCP server, you agree to these terms.
      </p>

      <h2 className={h2}>Answers are opinion, not fact</h2>
      <p className={body}>
        Every answer comes from Jev, an AI model from TypeSafe AI, and is one model’s opinion. It is not a
        statement of fact about any person, not a poll, and not our view. Don’t rely on it for anything that
        matters, and don’t present it as fact.{" "}
        <Link href="/how-it-works/scoring" className={link}>
          How Jev scores
        </Link>{" "}
        explains the method.
      </p>

      <h2 className={h2}>Fair use</h2>
      <p className={body}>
        Don’t use the site to harass anyone, or to try to get around its guardrails, such as the refusal of
        questions about abuse and private traits. Automated use is welcome through the API and MCP server within
        the limit of 20 questions a minute.
      </p>

      <h2 className={h2}>As is</h2>
      <p className={body}>
        The site is provided as is, with no warranty, and may change or stop at any time. To the extent the law
        allows, Banana Intelligence isn’t liable for any loss from using it.
      </p>

      <h2 className={h2}>Content and code</h2>
      <p className={body}>
        Portraits come from Wikimedia Commons under the licenses listed on the{" "}
        <Link href="/credits" className={link}>
          credits
        </Link>{" "}
        page. The site’s code is open source under the MIT license on{" "}
        <a href={REPO_URL} className={link}>
          GitHub
        </a>
        .
      </p>

      <h2 className={h2}>Questions</h2>
      <p className={body}>
        Open an issue on{" "}
        <a href={`${REPO_URL}/issues`} className={link}>
          GitHub
        </a>
        . See also{" "}
        <Link href="/privacy" className={link}>
          privacy
        </Link>
        .
      </p>
    </PageShell>
  );
}
