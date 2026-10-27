// How Jev's answer turns into groups on screen.
//
// "One winner" questions (funniest, best hair, who'd win a fight) use Jev's
// forced choice across all 100 people, so there is a clear top, a few close
// behind, and sometimes a clear bottom.
//
// "Everyone who fits" questions (who's from Texas) use each person's own
// yes/no probability, so they can have one answer, a crowd, or nobody.

export type Tier = {
  key: "pick" | "close" | "sure" | "likely" | "guess" | "bottom";
  label: string;
  ids: string[];
};

export type Answer =
  | { blocked: "abuse" | "private" }
  | { mode: "strict" | "out"; scores: Record<string, number> }
  | { mode: "normal"; shape: "many"; scores: Record<string, number> }
  | {
      mode: "normal";
      shape: "one";
      scores: Record<string, number>;
      best: Record<string, number>;
      worst?: string;
    };

export type Grouped = {
  tiers: Tier[];
  // The percentage shown next to each face: Jev's share of the vote for
  // one-winner questions, the yes probability otherwise.
  shown: Record<string, number>;
  // The yes/no score that sorts the pile (heavier sinks). Empty when the
  // pile shouldn't move, e.g. accusations.
  weight: Record<string, number>;
};

export const SURE = 0.8; // Jev is confident this person fits
export const LIKELY = 0.55; // more likely yes than no, with a margin
export const ABOVE_FIELD = 0.1; // and clearly above the typical person
export const GUESS_FLOOR = 0.2; // below this, a "best guess" is just noise
export const GUESS_COUNT = 3;
export const MAX_LIFTED = 24;

export const PICK_MIN = 0.15; // below this, Jev has no favorite
export const TIE = 0.75; // within 75% of the leader counts as a tie
export const CLOSE_MIN = 0.05; // at least 5% of Jev's vote
export const CLOSE_COUNT = 4;

// Crime and bigotry questions: only name people Jev is very sure about,
// with no "thinks so" or "best guess" groups.
export const STRICT = 0.9;

const desc = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);

export type Answered = Exclude<Answer, { blocked: string }>;

export function groupAnswer(a: Answered): Grouped {
  const ranked = desc(a.scores);

  if (a.mode !== "normal") {
    // "out": the server already limited these to people who are publicly out.
    const out = a.mode === "out";
    const ids = ranked.filter(([, p]) => out || p >= STRICT).map(([id]) => id);
    const label = out ? "Publicly out" : "Jev is very sure";
    return { tiers: ids.length ? [{ key: "sure", label, ids }] : [], shown: a.scores, weight: {} };
  }

  if (a.shape === "one") {
    const best = desc(a.best);
    const [lead] = best;
    if (!lead || lead[1] < PICK_MIN) {
      const ids = best.slice(0, GUESS_COUNT).map(([id]) => id);
      return {
        tiers: ids.length ? [{ key: "guess", label: "Jev can't pick one", ids }] : [],
        shown: a.best,
        weight: a.scores,
      };
    }
    const top = best.filter(([, p]) => p >= lead[1] * TIE).slice(0, 3).map(([id]) => id);
    const close = best
      .slice(top.length)
      .filter(([, p]) => p >= CLOSE_MIN)
      .slice(0, CLOSE_COUNT)
      .map(([id]) => id);
    const tiers: Tier[] = [{ key: "pick", label: top.length > 1 ? "Jev can't split them" : "Jev's pick", ids: top }];
    if (close.length) tiers.push({ key: "close", label: "Also in the running", ids: close });
    if (a.worst) tiers.push({ key: "bottom", label: "Bottom of the pile", ids: [a.worst] });
    return { tiers, shown: a.best, weight: a.scores };
  }

  // Everyone who fits. "Thinks so" also has to stand out from the field, so a
  // question where everyone scores 55-60% doesn't lift a dozen people.
  const median = ranked[Math.floor(ranked.length / 2)]?.[1] ?? 0;
  const sure = ranked.filter(([, p]) => p >= SURE).map(([id]) => id);
  const likely = ranked
    .filter(([, p]) => p >= LIKELY && p < SURE && p - median >= ABOVE_FIELD)
    .map(([id]) => id);

  if (sure.length || likely.length) {
    const tiers: Tier[] = [];
    const room = Math.max(0, MAX_LIFTED - sure.length);
    if (sure.length) tiers.push({ key: "sure", label: "Jev is sure", ids: sure.slice(0, MAX_LIFTED) });
    if (likely.length && room) tiers.push({ key: "likely", label: "Jev thinks so", ids: likely.slice(0, room) });
    return { tiers, shown: a.scores, weight: a.scores };
  }

  // Nobody cleared the bar. Show the closest few, labeled as a guess.
  const guess = ranked
    .filter(([, p]) => p >= GUESS_FLOOR)
    .slice(0, GUESS_COUNT)
    .map(([id]) => id);
  return {
    tiers: guess.length ? [{ key: "guess", label: "Jev's best guess", ids: guess }] : [],
    shown: a.scores,
    weight: a.scores,
  };
}

// Total people Jev named, before the MAX_LIFTED cap. Used for "and N more".
export function namedCount(a: Answered) {
  if (a.mode !== "normal" || a.shape !== "many") return null;
  const ranked = desc(a.scores);
  const median = ranked[Math.floor(ranked.length / 2)]?.[1] ?? 0;
  return ranked.filter(([, p]) => p >= SURE || (p >= LIKELY && p - median >= ABOVE_FIELD)).length;
}
