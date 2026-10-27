import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <p className="font-logo text-8xl leading-none tracking-[-0.03em] text-jev">Jev!</p>
      <h1 className="mt-8 text-2xl font-semibold tracking-[-0.01em] text-balance text-ink">
        Nobody’s here. Not even Jev.
      </h1>
      <p className="mt-3 text-base text-ink-soft">That page doesn’t exist.</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-jev px-6 text-base font-medium text-paper transition-transform duration-150 active:scale-[0.97]"
      >
        Back to the pile
      </Link>
    </main>
  );
}
