import { answer, cached } from "@/lib/answer";
import { clientIp, limited } from "@/lib/limit";

export const maxDuration = 30;

const MAX_LEN = 140;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const question =
    typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_LEN) {
    return Response.json({ error: "Ask something shorter." }, { status: 400 });
  }

  // Repeat questions are free and skip the limit.
  const hit = cached(question);
  if (hit) return Response.json(hit);

  if (limited(`ask:${clientIp(req)}`, 20)) {
    return Response.json({ error: "Slow down. Try again in a minute." }, { status: 429 });
  }

  try {
    return Response.json(await answer(question));
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Jev didn't answer. Try again." }, { status: 502 });
  }
}
