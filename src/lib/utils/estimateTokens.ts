import { countTokens } from 'gpt-tokenizer/encoding/o200k_base';

/** Estimates the token count of `text` using the bundled pure-JS tokenizer
 *  (`gpt-tokenizer`, o200k_base encoding — the modern GPT-4o/o1 vocabulary).
 *
 *  This is NOT Claude's exact tokenizer: the app runs `claude --print` under
 *  subscription auth, so Anthropic's count-tokens API is unavailable offline.
 *  Always surface the count with an `≈` label in the UI. On any tokenizer error
 *  (or empty input) returns 0 so a count never crashes a render. */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  try {
    return countTokens(text);
  } catch {
    return 0;
  }
}
