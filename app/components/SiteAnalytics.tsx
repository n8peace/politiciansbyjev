"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { Analytics } from "@vercel/analytics/next";
import { captureRef } from "@/lib/ref";

// Cookieless page views. The address is sent without its query string, so
// whatever a visitor typed into ?q= never leaves the browser. A ?ref= tag
// is counted once per tab as "Ref visit".
export default function SiteAnalytics() {
  useEffect(() => {
    const ref = captureRef();
    if (ref) track("Ref visit", { ref });
  }, []);
  return <Analytics beforeSend={(event) => ({ ...event, url: event.url.split("?")[0] })} />;
}
