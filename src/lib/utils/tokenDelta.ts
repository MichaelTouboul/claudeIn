import { estimateTokens } from './estimateTokens';

/** The token comparison between two renderings of the same data.
 *  - `before` / `after` — estimated (`≈`) token counts.
 *  - `saved` — `before - after`. Can be ≤ 0 when the "after" form is not smaller
 *    (TOON only wins on uniform/tabular data); callers default the send-format to
 *    JSON in that case and say so.
 *  - `pct` — percentage of `before` saved (0 when `before` is 0), rounded. */
export type TokenDelta = { before: number; after: number; saved: number; pct: number };

/** Compares the token cost of two text renderings (e.g. JSON vs TOON). Pure: it
 *  only calls the estimator, which itself never throws. */
export function tokenDelta(before: string, after: string): TokenDelta {
  const beforeTokens = estimateTokens(before);
  const afterTokens = estimateTokens(after);
  const saved = beforeTokens - afterTokens;
  const pct = beforeTokens === 0 ? 0 : Math.round((saved / beforeTokens) * 100);
  return { before: beforeTokens, after: afterTokens, saved, pct };
}
