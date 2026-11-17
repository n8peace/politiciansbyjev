import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/app/components/PageShell";

const TITLE = "A silly game with politicians";
const DESCRIPTION =
  "A free, silly party game. Ask a question, guess Jev’s pick, then watch 100 famous US politicians float or sink.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/play" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/play", images: "/og" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: "/og" },
};

const STEPS = [
  "Take turns asking a question. Anything silly works.",
  "Before the reveal, everyone guesses Jev’s pick.",
  "Watch the 100 float or sink. Closest guess wins the round.",
];

export default function Play() {
  const h2 = "mt-12 text-xl font-semibold tracking-[-0.01em] text-ink";
  return (
    <PageShell>
      <h1 className="text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-balance text-ink">
        A silly game with politicians
      </h1>
      <p className="mt-4 text-xl leading-relaxed text-pretty text-ink">
        Jev! is a free, silly game: you ask a question and watch 100 famous US politicians float or sink.
      </p>

      <h2 className={h2}>How to play</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-relaxed text-ink-soft marker:text-ink">
        {STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="mt-4 text-base leading-relaxed text-pretty text-ink-soft">
        Works on a phone, with friends, at a party, or alone. It is just for fun. Blame Jev.
      </p>

      <p className="mt-12">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full bg-jev px-6 text-base font-medium text-paper transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Start playing
        </Link>
      </p>
    </PageShell>
  );
}
