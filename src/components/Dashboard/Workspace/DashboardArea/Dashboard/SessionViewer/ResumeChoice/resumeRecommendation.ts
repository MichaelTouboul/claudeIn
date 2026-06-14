import type { SessionConversation } from "@/lib/types";

/** Effective Claude context window, in tokens. */
export const CONTEXT_WINDOW_TOKENS = 200_000;

/** A conversation is "heavy" once its estimate reaches this fraction of the window. */
export const HEAVY_CONTEXT_RATIO = 0.5;

/** Rough chars-per-token ratio for transcript content (Claude tokenizer ≈ 4 chars/token). */
const CHARS_PER_TOKEN = 4;

/** Which resume option the panel recommends / styles as the default. */
export type ResumeRecommendation = "compact" | "continue";

/**
 * Estimate the tokens the conversation would reload into context, from the
 * transcript content only (`Σ content.length / 4`). We deliberately do NOT use
 * `totalTokensIn`, which is cumulative across turns and massively overcounts the
 * single reloaded context.
 */
export function estimateContextTokens(conversation: SessionConversation): number {
  const totalChars = conversation.messages.reduce((sum, m) => sum + m.content.length, 0);
  return Math.floor(totalChars / CHARS_PER_TOKEN);
}

/**
 * Recommend `compact` only when the conversation is heavy (estimate ≥ 50% of the
 * window); otherwise `continue` is the safe, non-destructive default. Mirrors
 * terminal Claude Code, which does not auto-suggest compaction. When no
 * conversation is loaded yet, default to `continue`.
 */
export function recommendResumeOption(conversation: SessionConversation | null): ResumeRecommendation {
  if (!conversation) return "continue";
  const heavyThreshold = CONTEXT_WINDOW_TOKENS * HEAVY_CONTEXT_RATIO;
  return estimateContextTokens(conversation) >= heavyThreshold ? "compact" : "continue";
}
