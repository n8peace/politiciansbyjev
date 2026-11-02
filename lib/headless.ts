import "server-only";
import { getAnswer, MAX_LEN } from "@/lib/answer";
import { politicians } from "@/lib/politicians";
import { SITE_URL, askUrl } from "@/lib/site";
import { verdictFor } from "@/lib/verdict";

// The verdict as data, for agents: the JSON API and the MCP server both use
// this, and both go through the same guardrails as the page. Refused
// questions name nobody; accusation questions only list people at 90%+;
// "openly" questions only list people on the checked public-record list.

const byId = new Map(politicians.map((p) => [p.id, p]));

export type Person = { id: string; name: string; role: string; probability: number };

export type HeadlessVerdict =
  | {
      question: string;
      status: "answered";
      rule: "normal" | "strict" | "public-record";
      label: string;
      top: Person;
      picks: Person[];
      tie: string | null;
      note: string;
      url: string;
      card: string;
    }
  | { question: string; status: "nobody"; rule: "normal" | "strict"; note: string; url: string }
  | { question: string; status: "refused"; note: string };

const person = (id: string, scores: Record<string, number>): Person => {
  const p = byId.get(id)!;
  return { id, name: p.name, role: p.role, probability: Math.round(scores[id] * 100) / 100 };
};

export async function askHeadless(raw: string): Promise<HeadlessVerdict> {
  const question = raw.trim().slice(0, MAX_LEN);
  const a = await getAnswer(question);
  if ("blocked" in a) {
    return {
      question,
      status: "refused",
      note: "Jev won’t touch that one: no guessing about abuse or people’s private lives.",
    };
  }
  const v = verdictFor(a.scores, a.mode);
  if (!v) {
    return {
      question,
      status: "nobody",
      rule: a.mode === "strict" ? "strict" : "normal",
      note:
        a.mode === "strict"
          ? "Jev isn’t sure enough to name anyone. Accusations need 90% or better."
          : "Jev says: nobody. No one scored high enough to name.",
      url: askUrl(question),
    };
  }
  return {
    question,
    status: "answered",
    rule: a.mode === "out" ? "public-record" : a.mode,
    label: v.label,
    top: person(v.ids[0], a.scores),
    picks: v.ids.map((id) => person(id, a.scores)),
    tie: v.tie ? byId.get(v.tie)!.name : null,
    note:
      a.mode === "out"
        ? "Answered only from politicians who have said so publicly."
        : "Jev’s opinion, not fact. Blame Jev.",
    url: askUrl(question),
    card: `${SITE_URL}/og?q=${encodeURIComponent(question)}`,
  };
}

// Plain-text version for chat agents.
export function headlessText(v: HeadlessVerdict) {
  if (v.status !== "answered") return `“${v.question}”: ${v.note}`;
  const pct = (p: number) => `${Math.round(p * 100)}%`;
  const rest = v.picks.slice(1, 6).map((p) => `${p.name} ${pct(p.probability)}`);
  return [
    `“${v.question}”: Jev picks ${v.top.name} (${v.top.role}), ${pct(v.top.probability)}. ${v.label}.`,
    rest.length ? `Then ${rest.join(", ")}${v.picks.length > 6 ? `, plus ${v.picks.length - 6} more` : ""}.` : "",
    v.note,
    `See it: ${v.url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const roster = () =>
  politicians.map((p) => ({ id: p.id, name: p.name, role: p.role, years: p.years, era: p.era }));
