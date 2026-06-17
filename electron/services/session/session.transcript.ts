import path from "path";
import type { SessionMessage } from "../../types/session.types";

/**
 * Shared transcript-parsing helpers for Claude Code session JSONL
 * (`~/.claude/projects/*​/*.jsonl`). Used by `session.service` and
 * `activity.service` so the assistant-line shape is parsed in one place.
 */

/** Resolve the Claude Code transcripts base dir at call time (testable via process.env.HOME). */
export function getProjectsBase(): string {
  const home = process.env.HOME || require("os").homedir();
  return path.join(home, ".claude", "projects");
}

/** Normalized usage extracted from an assistant transcript line. */
export interface TranscriptUsage {
  model: string | null;
  tokensIn: number;
  tokensOut: number;
}

/**
 * Extract `{ model, tokensIn, tokensOut }` from a parsed transcript JSON line
 * when it is an assistant message with usage; otherwise `null`. The assistant
 * line shape is `obj.type === "assistant"`, `obj.message.model`,
 * `obj.message.usage.{input_tokens,output_tokens}`.
 */
export function extractAssistantUsage(obj: Record<string, unknown>): TranscriptUsage | null {
  if (obj.type !== "assistant") return null;
  const message = obj.message as Record<string, unknown> | undefined;
  if (!message) return null;
  const usage = message.usage as Record<string, unknown> | undefined;
  const tokensIn = typeof usage?.input_tokens === "number" ? usage.input_tokens : 0;
  const tokensOut = typeof usage?.output_tokens === "number" ? usage.output_tokens : 0;
  const model = typeof message.model === "string" ? message.model : null;
  return { model, tokensIn, tokensOut };
}

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
 * Pick the effective context window for an observed fill: the smallest standard
 * Claude window that still contains it. A 173k prefix reads against 200k; a 786k
 * prefix is unambiguously a 1M-tier session and reads against 1M (instead of
 * blowing past a hard-coded 200k and clamping to an aberrant 100%).
 */
function effectiveWindow(fill: number): number {
  for (const tier of CONTEXT_WINDOW_TIERS) {
    if (fill <= tier) return tier;
  }
  return CONTEXT_WINDOW_TIERS[CONTEXT_WINDOW_TIERS.length - 1];
}

/**
 * Convert a context-fill token count into a clamped 0–100 percentage of the
 * session's effective context window. `null` fill → `null` (unknown, omit the
 * bar). The 100 cap is reserved for a genuinely over-full window, never reached
 * by a mis-sized denominator.
 */
export function contextFillToPercent(fill: number | null): number | null {
  if (fill === null) return null;
  const window = effectiveWindow(fill);
  return Math.min(Math.round((fill / window) * 100), 100);
}

/**
 * Mutable cross-line parse state. Tool-only assistant turns accumulate their
 * tool names here until a text turn flushes them (mirrors `loadConversation`).
 * The live tail keeps one of these per file so deltas parsed incrementally
 * produce the exact same messages as a one-shot full read.
 */
export interface TranscriptParseState {
  pendingToolNames: string[];
}

export function createParseState(): TranscriptParseState {
  return { pendingToolNames: [] };
}

/**
 * Parse a single complete JSONL transcript line into zero or one
 * `SessionMessage`, advancing `state` for tool-only turns. Returns `null` for
 * lines that don't emit a message (tool-only turns, non-message lines, or
 * malformed JSON — never throws). Identical message shaping to
 * `loadConversation`, kept here so the live tail reuses it.
 */
export function parseTranscriptLine(
  line: string,
  state: TranscriptParseState,
): SessionMessage | null {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }

  if (obj.type === "user" && obj.promptId && obj.message) {
    const message = obj.message as Record<string, unknown>;
    const content = message.content;
    if (typeof content === "string") {
      return {
        role: "user",
        content,
        timestamp: typeof obj.timestamp === "string" ? obj.timestamp : "",
        uuid: typeof obj.uuid === "string" ? obj.uuid : "",
      };
    }
    return null;
  }

  if (obj.type === "assistant" && obj.message) {
    const message = obj.message as Record<string, unknown>;
    const contentArr = Array.isArray(message.content) ? message.content : [];
    const textParts: string[] = [];
    const toolNames: string[] = [];

    for (const c of contentArr as Record<string, unknown>[]) {
      if (c.type === "text" && typeof c.text === "string") textParts.push(c.text);
      if (c.type === "tool_use" && typeof c.name === "string") toolNames.push(c.name);
    }

    const usage = extractAssistantUsage(obj);
    const tokensIn = usage?.tokensIn || 0;
    const tokensOut = usage?.tokensOut || 0;
    const model = typeof message.model === "string" ? message.model : undefined;

    if (textParts.length === 0 && toolNames.length > 0) {
      state.pendingToolNames.push(...toolNames);
      return null;
    }
    if (textParts.length > 0) {
      const combinedTools = [...state.pendingToolNames, ...toolNames];
      state.pendingToolNames.length = 0;
      return {
        role: "assistant",
        content: textParts.join("\n"),
        timestamp: typeof obj.timestamp === "string" ? obj.timestamp : "",
        uuid: typeof obj.uuid === "string" ? obj.uuid : "",
        model,
        tokensIn,
        tokensOut,
        toolNames: combinedTools.length > 0 ? combinedTools : undefined,
      };
    }
  }

  return null;
}
