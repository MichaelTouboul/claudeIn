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
