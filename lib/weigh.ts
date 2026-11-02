// The weigh-in: after an answer, all 100 faces stack into ten columns by
// Jev's score, a histogram made of the politicians themselves. The page and
// the share card both lay it out here, so they draw the same chart.

export const BINS = 10;
export const binOf = (p: number) => Math.min(BINS - 1, Math.max(0, Math.floor(p * BINS)));

export type Dot = { id: string; x: number; y: number; row: number };

// Only plain answers have a score for everyone. Strict and "publicly out"
// answers keep just the few names they show, so there's nothing to weigh.
export const canWeigh = (scores: Record<string, number>, mode: string) =>
  mode === "normal" && Object.keys(scores).length >= 90;

// Lay the faces out bottom-up in each column, highest score on top. Faces
// shrink until the tallest column fits in `height`; `d` is the spacing.
export function weighIn(
  scores: Record<string, number>,
  { width, bottom, height, max, min = 8, pad = 0 }: { width: number; bottom: number; height: number; max: number; min?: number; pad?: number },
): { d: number; dots: Dot[] } {
  const cols: [string, number][][] = Array.from({ length: BINS }, () => []);
  for (const [id, p] of Object.entries(scores)) cols[binOf(p)].push([id, p]);
  for (const c of cols) c.sort((a, b) => a[1] - b[1]);

  const colW = (width - 2 * pad) / BINS;
  const tallest = Math.max(...cols.map((c) => c.length));
  const fits = (d: number) => Math.ceil(tallest / Math.max(1, Math.floor(colW / d))) * d <= height;
  let d = max;
  while (d > min && !fits(d)) d -= 0.5;

  const k = Math.max(1, Math.floor(colW / d));
  const dots: Dot[] = [];
  cols.forEach((c, b) => {
    const mid = pad + (b + 0.5) * colW;
    c.forEach(([id], i) => {
      const row = Math.floor(i / k);
      const inRow = Math.min(k, c.length - row * k);
      const x = mid + (i % k - (inRow - 1) / 2) * d;
      dots.push({ id, x, y: bottom - d / 2 - row * d, row });
    });
  });
  return { d, dots };
}
