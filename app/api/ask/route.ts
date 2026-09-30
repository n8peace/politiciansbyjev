import { experimental_evaluate as evaluate } from "ai";
import { politicians } from "@/lib/politicians";

export const maxDuration = 30;

const MAX_LEN = 140;
const CHUNK = 25; // questions per Jev call; chunks run in parallel

// Per-instance guards. Not bulletproof, but they stop casual hammering and
// make repeat questions free.
type Answer = { scores: Record<string, number> } | { blocked: true };
const cache = new Map<string, Answer>();
const hits = new Map<string, number[]>();
const LIMIT = 20;
const WINDOW_MS = 60_000;

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

// Jev screens its own questions. Opinions ("most corrupt", "worst") are fair
// game; accusing real people of crimes, abuse, bigotry, or private traits is not.
// Thresholds were set by probing Jev with sample questions.
const ACCUSATION = 0.65;
const BIGOTRY = 0.5;

async function screen(question: string) {
  const r = await evaluate({
    model: "typesafe-ai/jev",
    state: { question },
    questions: {
      accusation: {
        type: "boolean",
        instructions:
          "Does this question ask which real people committed a crime, sexual misconduct, abuse, or another specific wrongful act, or which have a private trait like sexuality or a medical condition?",
      },
      bigotry: {
        type: "boolean",
        instructions:
          "Does this question ask which real people are bigots or hold hateful views, such as racist, sexist, antisemitic, or Nazi?",
      },
    },
  });
  return (
    r.answers.accusation.probability >= ACCUSATION ||
    r.answers.bigotry.probability >= BIGOTRY
  );
}

async function score(question: string) {
  const chunks = [];
  for (let i = 0; i < politicians.length; i += CHUNK) {
    chunks.push(politicians.slice(i, i + CHUNK));
  }

  const results = await Promise.all(
    chunks.map((group) =>
      evaluate({
        model: "typesafe-ai/jev",
        state: {
          task: "A visitor asked a question about famous US politicians. Judge each person on their own.",
          question,
        },
        questions: Object.fromEntries(
          group.map((p) => [
            p.id,
            {
              type: "boolean" as const,
              instructions: `Is ${p.name} (${p.role}, ${p.years}) one of the answers to the visitor's question?`,
            },
          ]),
        ),
      }),
    ),
  );

  const scores: Record<string, number> = {};
  for (const r of results) {
    for (const [id, a] of Object.entries(r.answers)) {
      if (a.type === "boolean") scores[id] = a.probability;
    }
  }
  return scores;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const question =
    typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_LEN) {
    return Response.json({ error: "Ask something shorter." }, { status: 400 });
  }

  const key = question.toLowerCase().replace(/\s+/g, " ").replace(/[?!.]+$/, "");
  const cached = cache.get(key);
  if (cached) return Response.json(cached);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (limited(ip)) {
    return Response.json({ error: "Slow down. Jev needs a breather." }, { status: 429 });
  }

  try {
    const [blocked, scores] = await Promise.all([screen(question), score(question)]);
    const answer: Answer = blocked ? { blocked: true } : { scores };
    if (cache.size > 1000) cache.delete(cache.keys().next().value!);
    cache.set(key, answer);
    return Response.json(answer);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Jev didn't answer. Try again." }, { status: 502 });
  }
}
