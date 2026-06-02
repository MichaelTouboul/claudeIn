import path from "path";

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
