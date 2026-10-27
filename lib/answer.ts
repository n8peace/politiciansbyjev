import "server-only";
import { experimental_evaluate as evaluate } from "ai";
import { unstable_cache } from "next/cache";
import { politicians } from "@/lib/politicians";
import { STRICT, type Kind } from "@/lib/verdict";

export const MAX_LEN = 140;
const CHUNK = 25; // questions per Jev call; chunks run in parallel
const OUT = new Set(politicians.filter((p) => p.publiclyOut).map((p) => p.id));

// Jev sorts each question before answering it.
// - opinion / fact: answered normally.
// - crime / bigotry: answered, but only people Jev is very sure about are named.
// - openly LGBTQ: answered only from people marked publiclyOut in the data.
//   Jev alone rated two straight politicians 88-89% on "who's openly gay".
// - abuse / private traits: not answered. Jev can be confidently wrong here
//   (it rated a straight governor 86% on "who is gay"), and the harm is real.
// The category wording was tuned against 91 test questions (1 leak, 0 over-blocks).

type Mode = "normal" | "strict" | "out" | "blocked";

export type Answer =
  | { mode: "normal" | "strict" | "out"; kind: Kind; scores: Record<string, number> }
  | { blocked: true };

async function classify(question: string): Promise<{ mode: Mode; kind: Kind }> {
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
  const kind = k.choice as Kind;
  if (get("abuse") + get("private") >= 0.5) return { mode: "blocked", kind };
  if (get("out") >= 0.5) return { mode: "out", kind };
  if (get("crime") + get("bigotry") + get("abuse") + get("private") + get("out") >= 0.5) {
    return { mode: "strict", kind };
  }
  return { mode: "normal", kind };
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

async function compute(question: string): Promise<Answer> {
  const [{ mode, kind }, scores] = await Promise.all([classify(question), score(question)]);
  if (mode === "blocked") return { blocked: true };
  // Below-the-bar scores never leave the server for sensitive questions, so
  // hovering a face in the pile can't reveal a low-confidence accusation.
  if (mode === "strict") {
    return { mode, kind, scores: Object.fromEntries(Object.entries(scores).filter(([, v]) => v >= STRICT)) };
  }
  if (mode === "out") {
    return { mode, kind, scores: Object.fromEntries(Object.entries(scores).filter(([id, v]) => OUT.has(id) && v >= 0.5)) };
  }
  return { mode, kind, scores };
}

export const normalize = (q: string) =>
  q.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?!.]+$/, "");

// One answer per question, shared by every visitor, the page metadata, and the
// share image, so a link that gets passed around costs one Jev call a day.
const cached = unstable_cache(compute, ["jev-answer-v2"], { revalidate: 60 * 60 * 24 });

export function getAnswer(question: string) {
  return cached(normalize(question));
}
