"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Share the verdict. Phones get the native share sheet (with the result card
// attached when the platform allows files); desktops copy the link, which
// unfurls as the same card on X, iMessage, and Slack.
export default function Share({ question, text }: { question: string; text: string }) {
  const native = useSyncExternalStore(noop, canShareNatively, () => false);
  const [copied, setCopied] = useState(false);
  // Fetched ahead of the tap: Safari drops the share if we await a download
  // after the user's click.
  const [card, setCard] = useState<File | null>(null);
  const url = typeof window === "undefined" ? "" : shareUrl(question);
  const image = `/og?q=${encodeURIComponent(question)}`;

  useEffect(() => {
    if (!native) return;
    let live = true;
    fetch(image)
      .then((r) => (r.ok ? r.blob() : null))
      .then((png) => {
        if (live && png) setCard(new File([png], `jev-${slug(question)}.png`, { type: "image/png" }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [native, image, question]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  async function shareSheet() {
    try {
      if (card && navigator.canShare?.({ files: [card] })) {
        await navigator.share({ files: [card], text: `${text} ${url}` });
      } else {
        await navigator.share({ title: "Jev!", text, url });
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") copy();
    }
  }

  const quiet =
    "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink-soft transition-[color,background-color,transform] duration-150 ease-out hover:bg-ink/5 hover:text-ink active:scale-[0.97]";

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {native ? (
        <button type="button" onClick={shareSheet} className={primary}>
          <ShareIcon />
          Share
        </button>
      ) : (
        <button type="button" onClick={copy} className={primary} aria-live="polite">
          {copied ? <CheckIcon /> : <LinkIcon />}
          {copied ? "Link copied" : "Copy link"}
        </button>
      )}
      {!native && (
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={quiet}
        >
          Post on X
        </a>
      )}
      <a href={image} download={`jev-${slug(question)}.png`} className={quiet}>
        Save image
      </a>
    </div>
  );
}

const primary =
  "inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper transition-[background-color,transform] duration-150 ease-out hover:bg-black active:scale-[0.97]";

const noop = () => () => {};
const canShareNatively = () => typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches;

function shareUrl(question: string) {
  const u = new URL(window.location.origin);
  u.searchParams.set("q", question);
  return u.toString();
}

const slug = (q: string) =>
  q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "verdict";

const icon = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

const ShareIcon = () => (
  <svg {...icon}>
    <path d="M8 10V2.5M5 5.5l3-3 3 3M3.5 8.5v4a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-4" />
  </svg>
);
const LinkIcon = () => (
  <svg {...icon}>
    <path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.6 2.6 0 0 1 3.7 3.7L10.7 8.2M9 11.5l-1.2 1.2a2.6 2.6 0 0 1-3.7-3.7L5.3 7.8" />
  </svg>
);
const CheckIcon = () => (
  <svg {...icon}>
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
);
