import fs from "fs";

import {
  ImproveType,
  type ImproveChatInput,
  type ImproveTranscriptTurn,
} from "../types/improve.types";

/**
 * Self-Improve loop — scoping-chat prompt builder (I4).
 *
 * Split out of `improve-chat.service` to keep both files under the 300-line
 * limit. Pure string assembly + a bounded disk read; the service owns the spawn
 * seam and persistence concerns.
 */

/** Max bytes of source file content embedded in the prompt (keeps it bounded). */
const MAX_SOURCE_CHARS = 8_000;

/** Per-type guidance so the assistant scopes the right kind of work. */
const TYPE_GUIDANCE: Record<ImproveType, string> = {
  [ImproveType.Feature]: "a new capability the user wants added",
  [ImproveType.Bug]: "something broken the user wants fixed",
  [ImproveType.Design]: "a visual / layout / interaction improvement",
  [ImproveType.Performance]: "something slow the user wants faster",
  [ImproveType.Copy]: "wording / labels / microcopy the user wants changed",
};

/** Strip a trailing `:line` (or `:line:col`) suffix from a source path. */
function stripLineSuffix(sourcePath: string): string {
  return sourcePath.replace(/:\d+(?::\d+)?$/, "");
}

/** Read the source file (line-suffix stripped), capped; "" when unreadable. */
function readSource(sourcePath: string): string {
  try {
    const onDisk = stripLineSuffix(sourcePath);
    const raw = fs.readFileSync(onDisk, "utf8");
    return raw.length > MAX_SOURCE_CHARS
      ? `${raw.slice(0, MAX_SOURCE_CHARS)}\n…(truncated)…`
      : raw;
  } catch {
    return "";
  }
}

/** Inputs the prompt builder needs (the service's `improveChat` arg). */
export type ImproveChatPromptInput = ImproveChatInput;

function renderTranscript(transcript: ImproveTranscriptTurn[]): string {
  if (transcript.length === 0) return "(no messages yet)";
  return transcript.map((t) => `${t.role}: ${t.text}`).join("\n");
}

function renderContext(input: ImproveChatPromptInput): string {
  if (!input.component && !input.sourcePath) {
    return "Target: a general request (no specific component captured).";
  }
  const lines: string[] = ["Target component context:"];
  if (input.component) lines.push(`- component: ${input.component}`);
  if (input.sourcePath) lines.push(`- source: ${input.sourcePath}`);
  if (input.sourcePath) {
    const body = readSource(input.sourcePath);
    if (body) {
      lines.push("- source file contents:", "```tsx", body, "```");
    }
  }
  return lines.join("\n");
}

/**
 * Build the single `claude --print` prompt for one scoping turn. The assistant
 * is told to run a SHORT clarifying dialogue (1–3 targeted questions) and then
 * propose a concise structured recap (one-line title, description, optional
 * acceptance bullets). Discussion only — explicitly no tool use / no edits.
 */
export function buildImproveChatPrompt(input: ImproveChatPromptInput): string {
  return [
    "You are scoping a single self-improvement request for a desktop app.",
    `Request type: ${input.type} — ${TYPE_GUIDANCE[input.type]}.`,
    "",
    renderContext(input),
    "",
    "Conversation so far:",
    renderTranscript(input.transcript),
    "",
    "Your job is a SHORT scoping dialogue. If the request is still unclear, ask",
    "1–3 targeted clarifying questions (one short message). Once you have enough,",
    "propose a concise structured recap: a one-line Title, a Description, and",
    "optional Acceptance bullets. Discussion only — do NOT use tools, do NOT edit",
    "files. Reply with just your next message to the user.",
  ].join("\n");
}
