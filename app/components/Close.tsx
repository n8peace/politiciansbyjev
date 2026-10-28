"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Closes a text page: back to wherever the visitor came from on Jev (keeping their question),
// or home if they landed here directly. Esc does the same.
export default function Close() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    const fromJev = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (fromJev && window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <button
      type="button"
      onClick={close}
      aria-label="Close and go back"
      title="Close (Esc)"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-[color,background-color,transform] duration-150 ease-out hover:bg-ink/5 hover:text-ink active:scale-[0.97]"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
