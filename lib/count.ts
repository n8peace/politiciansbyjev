import "server-only";
import { after } from "next/server";
import { SITE_URL } from "@/lib/site";

// Counts agent calls (JSON API and MCP) as Web Analytics events, so they sit
// next to the site's "Ask" count. This posts to the same endpoint as
// @vercel/analytics/server, with two differences: the address it sends has no
// query string, so a question in ?q= never reaches analytics, and it posts to
// the public domain, which deployment protection doesn't cover. Production
// only; the post runs after the response is sent.

// API calls report Jev's result; MCP calls report which tool was used.
export type CallResult = "answered" | "nobody" | "refused" | "error" | "limited" | "ask" | "list";

export function countCall(req: Request, via: "api" | "mcp", result: CallResult) {
  if (process.env.VERCEL_ENV !== "production") return;
  const { pathname } = new URL(req.url);
  after(
    fetch(`${SITE_URL}/_vercel/insights/event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": req.headers.get("user-agent") ?? "",
        "x-vercel-ip": req.headers.get("x-forwarded-for") ?? "",
        "x-va-server": "1",
      },
      body: JSON.stringify({
        o: `${SITE_URL}${pathname}`,
        ts: Date.now(),
        sdkn: "@vercel/analytics/server",
        sdkv: "2.0.1",
        r: "",
        en: "Agent call",
        ed: { via, result },
      }),
    }).catch(() => {}),
  );
}
