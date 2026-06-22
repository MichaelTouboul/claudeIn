import fs from "fs";
import path from "path";

import type { ConversationStep } from "../../types/session.types";
import { getProjectsBase } from "./session.transcript";

/**
 * Extract the chronological tool-use steps of a single conversation from its
 * Claude Code transcript (`<projectPath-encoded>/<sessionId>.jsonl`). Every
 * assistant line's `message.content[]` block with `type === "tool_use"` becomes a
 * `ConversationStep` in transcript order. Defensive throughout: a missing file,
 * unreadable file, or malformed lines yield `[]` (never throws), mirroring the
 * other transcript readers.
 */
export function loadConversationSteps(
  projectPath: string,
  sessionId: string,
): ConversationStep[] {
  const filePath = path.join(encodeSessionsDir(projectPath), `${sessionId}.jsonl`);
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }
  const steps: ConversationStep[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    collectLineSteps(line, steps);
  }
  return steps;
}

/** Append every tool_use step in one transcript line to `out` (never throws). */
function collectLineSteps(line: string, out: ConversationStep[]): void {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return;
  }
  if (obj.type !== "assistant" || !obj.message) return;
  const message = obj.message as Record<string, unknown>;
  const content = Array.isArray(message.content) ? message.content : [];
  const ts = typeof obj.timestamp === "string" ? obj.timestamp : "";
  for (const block of content as Record<string, unknown>[]) {
    if (block.type !== "tool_use" || typeof block.name !== "string") continue;
    const input =
      block.input && typeof block.input === "object"
        ? (block.input as Record<string, unknown>)
        : {};
    out.push({ tool: block.name, target: summarizeToolInput(block.name, input), ts });
  }
}

/** Mirror `session.service`'s private sessions-dir encoding (slashes → dashes). */
function encodeSessionsDir(projectPath: string): string {
  return path.join(getProjectsBase(), projectPath.replace(/\//g, "-"));
}

/** Tools whose target is the basename of their `file_path` input. */
const FILE_PATH_TOOLS = new Set(["Read", "Edit", "Write", "NotebookEdit"]);
/** Tools whose target is their `pattern` input. */
const PATTERN_TOOLS = new Set(["Grep", "Glob"]);
const BASH_HEAD_LIMIT = 40;

/**
 * Concise human label for a tool call, derived from its input. Pure + total —
 * returns `null` when nothing sensible can be summarized (the caller renders the
 * tool name alone). Shared logic is duplicated for the renderer in
 * `src/lib/utils/summarizeToolInput` (process boundary); keep the two in sync.
 *
 * Rules: Read/Edit/Write/NotebookEdit → basename of `file_path`; Bash → first
 * ~40 chars of `command` (single line, ellipsized); Grep/Glob → `pattern`;
 * WebFetch → host of `url`; Task → `description` or `subagent_type`.
 */
export function summarizeToolInput(
  tool: string,
  input: Record<string, unknown>,
): string | null {
  if (FILE_PATH_TOOLS.has(tool)) return basename(str(input.file_path));
  if (PATTERN_TOOLS.has(tool)) return str(input.pattern);
  if (tool === "Bash") return bashHead(str(input.command));
  if (tool === "WebFetch") return hostOf(str(input.url));
  if (tool === "Task") return str(input.description) ?? str(input.subagent_type);
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function basename(filePath: string | null): string | null {
  if (!filePath) return null;
  const base = filePath.split(/[/\\]/).filter(Boolean).pop();
  return base ?? null;
}

function bashHead(command: string | null): string | null {
  if (!command) return null;
  const single = command.replace(/\s+/g, " ").trim();
  if (!single) return null;
  return single.length > BASH_HEAD_LIMIT ? `${single.slice(0, BASH_HEAD_LIMIT)}…` : single;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}
