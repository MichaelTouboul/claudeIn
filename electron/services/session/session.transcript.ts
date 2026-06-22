import fs from "fs";
import path from "path";
import type { SessionMessage, SessionSummary } from "../../types/session.types";

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

/**
 * Read the `.model` string from a single Claude Code settings JSON file.
 * Defensive: a missing file, unreadable file, malformed JSON, a non-string or
 * empty `model` all yield `null` (never throws) so the caller can fall through
 * to the next precedence layer.
 */
function readModelFromSettings(filePath: string): string | null {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const model = parsed.model;
    return typeof model === "string" && model.length > 0 ? model : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the model configured for a project from its `.claude` settings — the
 * source of truth for the context window when a transcript carries no `[1m]`
 * marker (that marker is virtually never persisted in practice). Precedence
 * (first non-empty wins, mirroring Claude Code):
 *
 *   1. `<projectPath>/.claude/settings.local.json` → `.model`
 *   2. `<projectPath>/.claude/settings.json`       → `.model`
 *   3. `~/.claude/settings.json`                   → `.model`  (global user)
 *
 * HOME is resolved at call time (`getProjectsBase`'s convention) so tests can
 * redirect the user layer via `process.env.HOME`. Returns `null` when no layer
 * carries a usable model string. When the returned string ends with `"[1m]"`,
 * `resolveContextWindow` pins the session to the 1M window.
 */
export function resolveProjectModel(projectPath: string): string | null {
  const home = process.env.HOME || require("os").homedir();
  const candidates = [
    path.join(projectPath, ".claude", "settings.local.json"),
    path.join(projectPath, ".claude", "settings.json"),
    path.join(home, ".claude", "settings.json"),
  ];
  for (const candidate of candidates) {
    const model = readModelFromSettings(candidate);
    if (model !== null) return model;
  }
  return null;
}

/**
 * Stable ordering for the sidebar session list: pinned sessions first (oldest
 * pin first within the pinned group so the order is stable), then everything
 * else by most-recent activity. Used by `listSessions`.
 */
export function compareSessionsForList(a: SessionSummary, b: SessionSummary): number {
  if (a.pinned && b.pinned) return (a.pinnedAt || "").localeCompare(b.pinnedAt || "");
  if (a.pinned) return -1;
  if (b.pinned) return 1;
  return (b.lastActiveAt || "").localeCompare(a.lastActiveAt || "");
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
