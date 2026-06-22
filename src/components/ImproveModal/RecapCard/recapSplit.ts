/** The fenced ```recap block opener, matched the same way as `recapScope`. */
const RECAP_FENCE = /```recap\s*\n/i;

/**
 * The conversational preamble that appears BEFORE the fenced ```recap block.
 * Returns the trimmed text preceding the fence, or '' when the message is a
 * bare recap with no preamble (or has no fence at all).
 */
export function recapPreamble(text: string): string {
  const match = text.match(RECAP_FENCE);
  if (!match || match.index === undefined) return '';
  return text.slice(0, match.index).trim();
}
