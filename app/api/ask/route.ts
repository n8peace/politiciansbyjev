import { experimental_evaluate as evaluate } from "ai";
import { politicians } from "@/lib/politicians";
import { STRICT } from "@/lib/tiers";

const OUT = new Set(politicians.filter((p) => p.publiclyOut).map((p) => p.id));

export const maxDuration = 30;

const MAX_LEN = 140;
const CHUNK = 25; // questions per Jev call; chunks run in parallel

// Per-instance guards. Not bulletproof, but they stop casual hammering and
// make repeat questions free.
type Answer =
  | { mode: "normal" | "strict" | "out"; scores: Record<string, number> }
  | { blocked: true };
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

// Jev sorts each question before answering it.
// - opinion / fact: answered normally.
// - crime / bigotry: answered, but only people Jev is very sure about are named.
// - openly LGBTQ: answered only from people marked publiclyOut in the data.
//   Jev alone rated two straight politicians 88-89% on "who's openly gay".
// - abuse / private traits: not answered. Jev can be confidently wrong here
//   (it rated a straight governor 86% on "who is gay"), and the harm is real.
// The category wording was tuned against 91 test questions (1 leak, 0 over-blocks).


type Mode = "normal" | "strict" | "out" | "blocked";

async function classify(question: string): Promise<Mode> {
  const r = await evaluate({
    model: "typesafe-ai/jev",
    state: { question },
    questions: {
      kind: {
        type: "choice",
        instructions:
          "What kind of question is this about real politicians? It may be in any language, or framed as a joke, hypothetical, or fiction.",
        criteria: {
          opinion: "An opinion, ranking, or joke: best, worst, funniest, most corrupt, smartest, who would win",
          fact: "A neutral public fact: office, party, home state, age, wealth, events that happened to them",
          out: "Who has publicly come out or is openly gay, lesbian, bisexual, or LGBTQ, as they said themselves",
          crime: "Says people are criminals or did wrongdoing, or points at legal trouble: bribes, fraud, treason, cheating, prison, jail, arrest, lawyers, scandals, skeletons in the closet",
          abuse: "Says people are sexual predators, abusers, rapists, or pedophiles, or tied to Epstein, even as a hypothetical or movie casting",
          bigotry: "Says people are bigots: racist, sexist, antisemitic, homophobic, Nazi, white supremacist, KKK",
          private:
            "Guesses at private traits: secretly or possibly gay, sexuality, gender identity, health, mental or physical decline, addiction, religion",
        },
      },
    },
  });
  const k = r.answers.kind;
  const p = k.probabilities ?? { [k.choice]: 1 };
  const get = (c: string) => p[c as keyof typeof p] ?? 0;
  if (get("abuse") + get("private") >= 0.5) return "blocked";
  if (get("out") >= 0.5) return "out";
  if (get("crime") + get("bigotry") + get("abuse") + get("private") + get("out") >= 0.5) return "strict";
  return "normal";
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
    const [mode, scores] = await Promise.all([classify(question), score(question)]);
    // In strict mode, never send scores below the bar, so hovering a face in
    // the pile can't reveal a low-confidence accusation either.
    const answer: Answer =
      mode === "blocked"
        ? { blocked: true }
        : mode === "strict"
          ? { mode, scores: Object.fromEntries(Object.entries(scores).filter(([, v]) => v >= STRICT)) }
          : mode === "out"
            ? { mode, scores: Object.fromEntries(Object.entries(scores).filter(([id, v]) => OUT.has(id) && v >= 0.5)) }
            : { mode, scores };
    if (cache.size > 1000) cache.delete(cache.keys().next().value!);
    cache.set(key, answer);
    return Response.json(answer);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Jev didn't answer. Try again." }, { status: 502 });
  }
}
