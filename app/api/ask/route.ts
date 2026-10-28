import { getAnswer, MAX_LEN } from "@/lib/answer";
import { limited } from "@/lib/limit";

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_LEN) {
    return Response.json({ error: "Ask something shorter." }, { status: 400 });
  }

  if (limited(req)) {
    return Response.json({ error: "Slow down. Jev needs a breather." }, { status: 429 });
  }

  try {
    return Response.json(await getAnswer(question));
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Jev didn’t answer." }, { status: 502 });
  }
}
