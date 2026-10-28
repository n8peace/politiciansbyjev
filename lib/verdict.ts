// How Jev's per-person probabilities become one verdict on screen.
// Every person gets an independent yes/no probability, so a question can have
// one clear answer, a crowd, or nobody. The verdict always leads with a single
// top pick, so there is something worth sending to a friend.

export const SURE = 0.8; // Jev is confident this person fits
export const LIKELY = 0.55; // more likely yes than no, with a margin
export const GUESS_FLOOR = 0.4; // below this, a "best guess" is just noise ("asdfgh" tops out near 0.26)
export const GUESS_COUNT = 3;
export const STRICT = 0.9; // crime and bigotry: only people Jev is very sure about
export const TIE = 0.02; // a runner-up this close to the top is a near tie

export type Mode = "normal" | "strict" | "out";
export type Kind = "opinion" | "fact" | "out" | "crime" | "abuse" | "bigotry" | "private";

export type Verdict = {
  ids: string[]; // picks, best first
  label: string; // how sure Jev is about the top pick
  tie?: string; // runner-up within TIE of the top pick
};

export function verdictFor(scores: Record<string, number>, mode: Mode): Verdict | null {
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = ranked[0]?.[1] ?? 0;

  let ids: string[];
  let label: string;
  if (mode === "out") {
    ids = ranked.map(([id]) => id);
    label = "Publicly out";
  } else if (mode === "strict") {
    ids = ranked.filter(([, p]) => p >= STRICT).map(([id]) => id);
    label = "Jev is very sure";
  } else {
    ids = ranked.filter(([, p]) => p >= LIKELY).map(([id]) => id);
    label = top >= SURE ? "Jev is sure" : "Jev thinks so";
    if (!ids.length) {
      ids = ranked.filter(([, p]) => p >= GUESS_FLOOR).slice(0, GUESS_COUNT).map(([id]) => id);
      label = "Jev’s best guess";
    }
  }
  if (!ids.length) return null;

  const second = ranked[1];
  const tie = ids.length > 1 && second && top - second[1] <= TIE ? second[0] : undefined;
  return { ids, label, tie };
}

export const pct = (p: number | undefined) => `${Math.round((p ?? 0) * 100)}%`;
