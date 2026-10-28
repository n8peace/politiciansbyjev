"use client";

import { Analytics } from "@vercel/analytics/next";

// Cookieless page views. The address is sent without its query string, so
// whatever a visitor typed into ?q= never leaves the browser.
export default function SiteAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: event.url.split("?")[0] })} />;
}
