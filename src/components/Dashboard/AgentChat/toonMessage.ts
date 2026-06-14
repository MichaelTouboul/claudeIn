import { estimateTokens } from '@/lib/utils';

/** A detected TOON/JSON attachment fence inside a sent user message. */
export type ToonMessageInfo = {
  /** The fenced format, mirrored from the fence language. */
  format: 'toon' | 'json';
  /** ≈ token count of the fenced body (the bundled tokenizer, not Claude's exact). */
  tokens: number;
};

/** Matches a ```toon or ```json fenced block, capturing the language + inner body.
 *  Tolerates a trailing newline before the closing fence. */
const FENCE_RE = /```(toon|json)\n([\s\S]*?)\n```/;

/** Detects whether a sent user message carries a TOON/JSON attachment fence (the
 *  send path inlines pasted JSON this way). Returns the fence info for the FIRST
 *  match, or null when there is no such fence. Pure: no DOM, no side effects. */
export function parseToonMessage(content: string): ToonMessageInfo | null {
  const match = FENCE_RE.exec(content);
  if (!match) return null;
  const format = match[1] === 'toon' ? 'toon' : 'json';
  return { format, tokens: estimateTokens(match[2]) };
}
