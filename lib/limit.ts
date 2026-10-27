// Per-instance rate limit. Not bulletproof, but it stops casual hammering.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;

export function limited(key: string, limit: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.delete(hits.keys().next().value!);
  return recent.length > limit;
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
