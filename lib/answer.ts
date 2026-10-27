import { experimental_evaluate as evaluate } from "ai";
import { politicians } from "@/lib/politicians";
import { STRICT, type Answer } from "@/lib/tiers";

// Shared by /api/ask and the share image, so a shared link shows the same answer.

const OUT = new Set(politicians.filter((p) => p.publiclyOut).map((p) => p.id));
const CHUNK = 25; // people per yes/no call; chunks run in parallel

// Jev sorts each question before answering it.
// - opinion / fact: answered normally.
// - crime / bigotry: answered, but only people Jev is very sure about are named.
// - openly LGBTQ: answered only from people marked publiclyOut in the data.
//   Jev alone rated two straight politicians 88-89% on "who's openly gay".
// - abuse / private traits: not answered. Jev can be confidently wrong here
//   (it rated a straight governor 86% on "who is gay"), and the harm is real.
// The category wording was tuned against 91 test questions (1 leak, 0 over-blocks).
//
// It also decides two things about the answer:
// - shape: one winner ("who's the funniest") or everyone who fits ("who's from Texas").
// - whether naming the person at the bottom would be an insult in disguise.
//   "Least funny" is fine. "Least honest" is an accusation, and "worst babysitter"
//   named Matt Gaetz, so a bottom is shown only when two checks agree:
//   light (an allow-list of harmless traits; 40 questions, risky ones scored
//   0.07-0.36, light ones 0.63-0.95) and harsh (22 questions, harmless 0.10-0.36,
//   risky 0.47-0.77).
type Sorted = {
  mode: "normal" | "strict" | "out" | "blocked";
  shape: "one" | "many";
  bottomOk: boolean;
};

const LIGHT_MIN = 0.6;
const HARSH_MAX = 0.4;

async function classify(question: string): Promise<Sorted> {
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
      shape: {
        type: "choice",
        instructions: "What does the visitor want?",
        criteria: {
          one: "A single winner or a ranking: the most, the best, the funniest, who would win, who is likeliest",
          many: "Everyone who fits a description: who served in, who is from, which ones, who has",
        },
      },
      light: {
        type: "boolean",
        instructions:
          "Is this question only about a light, harmless trait, such as a talent, looks, style, humor, a skill, money, physical toughness, or a silly fight or survival hypothetical? Answer no if it touches character, morals, honesty, kindness, trust, safety, children, family, romance, relationships, drinking, health, sanity, patriotism, the law, or how good someone is at their job in office.",
      },
      harsh: {
        type: "boolean",
        instructions:
          "Picture the person who comes LAST on this question, at the opposite end from what was asked. Would naming them amount to calling a real person dishonest, a liar, a cheater, corrupt, a criminal, intolerant, a bigot, an abuser, cruel, unpatriotic, or in poor physical or mental health?",
      },
    },
  });
  const k = r.answers.kind;
  const p = k.probabilities ?? { [k.choice]: 1 };
  const get = (c: string) => p[c as keyof typeof p] ?? 0;
  const shape = r.answers.shape.choice;
  const mode: Sorted["mode"] =
    get("abuse") + get("private") >= 0.5
      ? "blocked"
      : get("out") >= 0.5
        ? "out"
        : get("crime") + get("bigotry") + get("abuse") + get("private") + get("out") >= 0.5
          ? "strict"
          : "normal";
  const bottomOk =
    get("opinion") >= 0.8 && r.answers.light.probability >= LIGHT_MIN && r.answers.harsh.probability < HARSH_MAX;
  return { mode, shape, bottomOk };
}

// Every person, judged on their own: "is this person one of the answers?"
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

// Everyone at once: "which one person is the best answer, and which the worst?"
// Judged alone, opinion questions bunch up (12 people at 55-64% on "best hair").
// Forced to choose, Jev commits: JFK 45%, Obama 21%, Clinton 12%.
const PEOPLE = Object.fromEntries(politicians.map((p) => [p.id, `${p.name} (${p.role})`]));

async function pick(question: string) {
  const r = await evaluate({
    model: "typesafe-ai/jev",
    state: {
      task: "A visitor asked a question about famous US politicians. Compare everyone on the list.",
      question,
    },
    questions: {
      best: {
        type: "choice",
        instructions: "Which one person on the list is the best answer to the visitor's question?",
        criteria: PEOPLE,
      },
      worst: {
        type: "choice",
        instructions:
          "Which one person on the list is the worst answer: the opposite end from what the visitor asked about?",
        criteria: PEOPLE,
      },
    },
  });
  const share = (a: { probabilities?: Record<string, number> }) =>
    Object.entries(a.probabilities ?? {}).sort((x, y) => y[1] - x[1]);
  return { best: share(r.answers.best), worst: share(r.answers.worst) };
}

const BEST_FLOOR = 0.01; // shares under 1% aren't sent
const WORST_MIN = 0.12; // the bottom pick has to be a real pick
const WORST_LEAD = 1.3; // and clearly ahead of the next one

const cache = new Map<string, Answer>();

export const cacheKey = (question: string) =>
  question.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?!.]+$/, "");

export function cached(question: string) {
  return cache.get(cacheKey(question));
}

export async function answer(question: string): Promise<Answer> {
  const key = cacheKey(question);
  const hit = cache.get(key);
  if (hit) return hit;

  const [sorted, scores, picked] = await Promise.all([classify(question), score(question), pick(question)]);
  let result: Answer;
  if (sorted.mode === "blocked") {
    result = { blocked: true };
  } else if (sorted.mode === "strict") {
    // Never send scores below the bar, so hovering a face in the pile
    // can't reveal a low-confidence accusation either.
    result = { mode: "strict", scores: Object.fromEntries(Object.entries(scores).filter(([, v]) => v >= STRICT)) };
  } else if (sorted.mode === "out") {
    result = {
      mode: "out",
      scores: Object.fromEntries(Object.entries(scores).filter(([id, v]) => OUT.has(id) && v >= 0.5)),
    };
  } else if (sorted.shape === "many") {
    result = { mode: "normal", shape: "many", scores };
  } else {
    const best = Object.fromEntries(picked.best.filter(([, v]) => v >= BEST_FLOOR));
    const [w1, w2] = picked.worst;
    const worst =
      sorted.bottomOk && w1 && w1[1] >= WORST_MIN && w1[1] >= (w2?.[1] ?? 0) * WORST_LEAD && !(w1[0] in best)
        ? w1[0]
        : undefined;
    result = { mode: "normal", shape: "one", scores, best, ...(worst ? { worst } : {}) };
  }

  if (cache.size > 1000) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
