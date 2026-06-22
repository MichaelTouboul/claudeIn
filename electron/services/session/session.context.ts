import fs from "fs";

/**
 * Context-window math for Claude Code session transcripts. Split out of
 * `session.transcript` to keep both files under the 300-line limit; the
 * transcript module re-exports these so existing importers
 * (`./session.transcript`) keep working unchanged.
 *
 * The single source of truth for: which window a session ran on
 * (`resolveContextWindow`), the prompt-side fill of a turn
 * (`extractContextFill`), and the resulting percent (`contextFillToPercent`).
 */

/**
 * The standard Claude context-window sizes, smallest first. A model id alone
 * does not tell us which window a session ran on — `claude-opus-4-8` reports the
 * SAME id whether the conversation used the 200k window or the 1M (`[1m]`) tier.
 * So we tier by *observed* fill: pick the smallest standard window that actually
 * contains the measured prompt size (see `contextFillToPercent`).
 */
export const CONTEXT_WINDOW_TIERS = [200_000, 1_000_000] as const;

/** Back-compat: the smallest (default) Claude context window, in tokens. */
export const CONTEXT_WINDOW_TOKENS = CONTEXT_WINDOW_TIERS[0];

/**
 * Prompt-side context fill (tokens) carried by ONE assistant turn's usage:
 * `input + cache_read + cache_creation`. Claude reports these per-turn
 * cumulatively (the cache tokens are the live conversation prefix), so the LAST
 * assistant turn's prompt total best approximates current context fill.
 *
 * `output_tokens` is deliberately EXCLUDED: it is the model's *response*, not
 * part of the context window at the moment usage is reported (it only enters the
 * context as input on the *next* turn, where it is already counted in the cache
 * read). Including it overshoots the real fill by the last response's size.
 *
 * Returns `null` for a non-assistant / usage-less line, or when the prompt-side
 * fill is zero.
 */
export function extractContextFill(obj: Record<string, unknown>): number | null {
  if (obj.type !== "assistant") return null;
  const message = obj.message as Record<string, unknown> | undefined;
  const usage = message?.usage as Record<string, unknown> | undefined;
  if (!usage) return null;
  const num = (k: string): number => (typeof usage[k] === "number" ? (usage[k] as number) : 0);
  const total =
    num("input_tokens") +
    num("cache_read_input_tokens") +
    num("cache_creation_input_tokens");
  return total > 0 ? total : null;
}

/**
 * THE single source of truth for a session's context window.
 *
 * A model id alone does not tell us which window a session ran on
 * (`claude-opus-4-8` is the SAME id on the 200k and the 1M tier). Two signals,
 * in priority order:
 *
 * 1. An explicit `[1m]` marker, when the transcript happens to persist one in
 *    `toolUseResult.resolvedModel` (e.g. `"claude-opus-4-8[1m]"`) — authoritative
 *    → 1M. This is rare (~1 in 60 sessions) but unambiguous when present.
 * 2. Otherwise tier by *observed* fill: the smallest standard window that still
 *    contains the measured prompt size. A 173k prefix reads against 200k; a 786k
 *    prefix is unambiguously a 1M-tier session (instead of blowing past a
 *    hard-coded 200k and clamping to an aberrant 100%).
 */
export function resolveContextWindow(
  fill: number,
  resolvedModel?: string | null,
): number {
  if (typeof resolvedModel === "string" && resolvedModel.endsWith("[1m]")) {
    return 1_000_000;
  }
  for (const tier of CONTEXT_WINDOW_TIERS) {
    if (fill <= tier) return tier;
  }
  return CONTEXT_WINDOW_TIERS[CONTEXT_WINDOW_TIERS.length - 1];
}

/**
 * Convert a context-fill token count into a clamped 0–100 percentage of a given
 * context window. The 100 cap is reserved for a genuinely over-full window,
 * never reached by a mis-sized denominator.
 */
export function contextPercent(fill: number, window: number): number {
  return Math.min(Math.round((fill / window) * 100), 100);
}

/**
 * Convenience wrapper for callers that have a (possibly null) fill and an
 * optional `[1m]` marker: resolves the window and computes the percent in one
 * step, routing through the single `resolveContextWindow` + `contextPercent`
 * implementation. `null` fill → `null` (unknown, omit the bar).
 */
export function contextFillToPercent(
  fill: number | null,
  resolvedModel?: string | null,
): number | null {
  if (fill === null) return null;
  return contextPercent(fill, resolveContextWindow(fill, resolvedModel));
}

/**
 * Best-effort extraction of an explicit resolved model id from a transcript
 * line. Claude occasionally records the *window-qualified* model
 * (`"claude-opus-4-8[1m]"`) under `toolUseResult.resolvedModel`; when present it
 * pins the session's window (see `resolveContextWindow`). Returns `null` when
 * absent or not a string.
 */
export function extractResolvedModel(obj: Record<string, unknown>): string | null {
  const toolUseResult = obj.toolUseResult as Record<string, unknown> | undefined;
  const resolved = toolUseResult?.resolvedModel;
  return typeof resolved === "string" ? resolved : null;
}

/**
 * One-time initial scan of a whole transcript file for its last `resolvedModel`
 * marker. The live tail (`session.watch`) only re-reads newly-appended lines, so
 * a `[1m]` marker written BEFORE the watch started is never seen and the
 * session's window stays mis-pinned (a 1M session reads as the 200k window).
 * `startWatching` calls this once per existing file to seed its per-file
 * resolved-model cache, so the live bar tiers like the sidebar.
 *
 * Returns the LAST `resolvedModel` found (mirroring the tail, where a later
 * marker overwrites an earlier one), or `null` when the file is missing,
 * unreadable, or carries no marker. Defensive: never throws — a malformed line
 * is skipped, a malformed/missing file yields `null`.
 */
export function findResolvedModelInFile(filePath: string): string | null {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
  let last: string | null = null;
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      const resolved = extractResolvedModel(JSON.parse(line));
      if (resolved !== null) last = resolved;
    } catch {}
  }
  return last;
}
