"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { Analytics, type BeforeSend } from "@vercel/analytics/next";
import { captureRef } from "@/lib/ref";

// Cookieless page views. The address is sent without its query string, so
// whatever a visitor typed into ?q= never leaves the browser.
const stripQuery: BeforeSend = (event) => ({ ...event, url: event.url.split("?")[0] });

// A ?ref= tag is counted once per tab as "Ref visit".
export default function SiteAnalytics() {
  useEffect(() => {
    const ref = captureRef();
    if (!ref) return;
    // <Analytics> sets up window.va only after it mounts, later than this
    // effect, and track() drops events until then. Start the same queue it
    // uses, with the query stripped first; the script sends what's queued
    // once it loads.
    window.va ??= (...params) => (window.vaq ??= []).push(params);
    window.va("beforeSend", stripQuery);
    track("Ref visit", { ref });
  }, []);
  return <Analytics beforeSend={stripQuery} />;
}
