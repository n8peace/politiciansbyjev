import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <p className="font-logo text-[6rem] leading-none tracking-tight text-jev sm:text-[8rem]">Jev!</p>
      <h1 className="mt-6 text-xl font-semibold text-balance text-ink">Jev looked through the whole pile.</h1>
      <p className="mt-2 text-ink-soft text-pretty">This page isn&apos;t in it.</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center rounded-full bg-ink px-6 font-medium text-white transition-transform active:scale-[0.97]"
      >
        Back to the pile
      </Link>
    </main>
  );
}
