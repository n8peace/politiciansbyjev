// How Jev's per-person probability turns into groups on screen.
// Every person gets an independent yes/no probability, so a question can
// have one clear answer, a whole crowd, or nobody at all.

export type Tier = {
  key: "sure" | "likely" | "guess";
  label: string;
  ids: string[];
};

export const SURE = 0.8; // Jev is confident this person fits
export const LIKELY = 0.55; // more likely yes than no, with a margin
export const GUESS_FLOOR = 0.2; // below this, a "best guess" is just noise
export const GUESS_COUNT = 3;

export function groupScores(scores: Record<string, number>): Tier[] {
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const sure = ranked.filter(([, p]) => p >= SURE).map(([id]) => id);
  const likely = ranked
    .filter(([, p]) => p >= LIKELY && p < SURE)
    .map(([id]) => id);

  if (sure.length || likely.length) {
    const tiers: Tier[] = [];
    if (sure.length) tiers.push({ key: "sure", label: "Jev is sure", ids: sure });
    if (likely.length)
      tiers.push({ key: "likely", label: "Jev thinks so", ids: likely });
    return tiers;
  }

  // Nobody cleared the bar. Show the closest few, labeled as a guess.
  const guess = ranked
    .filter(([, p]) => p >= GUESS_FLOOR)
    .slice(0, GUESS_COUNT)
    .map(([id]) => id);
  return guess.length
    ? [{ key: "guess", label: "Jev's best guess", ids: guess }]
    : [];
}
