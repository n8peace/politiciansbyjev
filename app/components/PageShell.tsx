import Link from "next/link";
import Close from "@/app/components/Close";

// The frame for Jev's text pages: wordmark home, the other pages, and an X.
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-2">
          <Link href="/" className="font-logo text-[2rem] leading-none tracking-[-0.025em] text-jev" aria-label="Jev! home">
            Jev!
          </Link>
          <nav className="flex items-center gap-1 text-sm text-ink-soft">
            <Link href="/how-it-works" className="inline-flex h-11 items-center rounded-full px-3 hover:bg-ink/5 hover:text-ink">
              How it works
            </Link>
            <Link href="/questions" className="hidden h-11 items-center rounded-full px-3 hover:bg-ink/5 hover:text-ink sm:inline-flex">
              What Jev says
            </Link>
            <Close />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">{children}</main>
      <footer className="mx-auto max-w-2xl border-t border-line px-4 py-8 text-sm text-ink-soft">
        <p>
          An open-source demo of{" "}
          <a href="https://vercel.com/ai-gateway/models/jev" className="text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
            Jev
          </a>
          . <Link href="/credits" className="text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">Photo credits</Link>
          . <a href="https://bananaintelligence.ai" className="text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">A Banana Intelligence product</a>.
        </p>
      </footer>
    </div>
  );
}
