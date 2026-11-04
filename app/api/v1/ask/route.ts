import { askHeadless } from "@/lib/headless";
import { MAX_LEN } from "@/lib/answer";
import { limited } from "@/lib/limit";
import { countCall } from "@/lib/count";

// Public JSON API for agents and scripts:
//   GET  /api/v1/ask?q=Best%20president%20ever
//   POST /api/v1/ask  {"question": "Best president ever"}
// Same answers, cache, guardrails, and rate limit as the site. Each call that
// reaches the function is counted as "Agent call" (via api); repeats the CDN
// serves from its one-hour cache never reach it, so they aren't.

export const maxDuration = 30;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function answer(req: Request, question: unknown) {
  const q = typeof question === "string" ? question.trim() : "";
  if (!q || q.length > MAX_LEN) {
    return Response.json({ error: `Send a question of 1 to ${MAX_LEN} characters.` }, { status: 400, headers: cors });
  }
  if (limited(req)) {
    countCall(req, "api", "limited");
    return Response.json({ error: "Slow down: 20 questions a minute." }, { status: 429, headers: cors });
  }
  try {
    const v = await askHeadless(q);
    countCall(req, "api", v.status);
    return Response.json(v, { headers: { ...cors, "Cache-Control": "public, s-maxage=3600" } });
  } catch (err) {
    console.error(err);
    countCall(req, "api", "error");
    return Response.json({ error: "Jev didn’t answer. Try again." }, { status: 502, headers: cors });
  }
}

export function GET(req: Request) {
  return answer(req, new URL(req.url).searchParams.get("q"));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return answer(req, body?.question);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
