// Per-instance rate limit. Not bulletproof, but it stops casual hammering.
// Cached answers still count, which is fine: 20 a minute is a lot of asking.
const hits = new Map<string, number[]>();
const LIMIT = 20;
const WINDOW_MS = 60_000;

export function limited(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}
