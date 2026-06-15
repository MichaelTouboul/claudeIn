import fs from "fs";

import { definePrompt, PromptId } from "./prompt.types";
import {
  ImproveType,
  type ImproveChatInput,
  type ImproveTranscriptTurn,
} from "../../types/improve.types";

/**
 * Self-Improve loop — scoping-chat prompt. Moved verbatim from
 * `improve/improve-chat.prompt.buildImproveChatPrompt`. Pure string assembly +
 * a bounded disk read; the service owns the spawn seam and persistence.
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

function renderTranscript(transcript: ImproveTranscriptTurn[]): string {
  if (transcript.length === 0) return "(no messages yet)";
  return transcript.map((t) => `${t.role}: ${t.text}`).join("\n");
}

function renderContext(input: ImproveChatInput): string {
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
 * The exact machine-parsable recap shape the assistant must emit once scoping
 * has converged. `recap.ts` prefers extracting this fenced block. Kept as one
 * string so the prompt and the renderer parser describe the same contract.
 */
const RECAP_BLOCK_SPEC = [
  "```recap",
  "TITLE: <one line>",
  "DESCRIPTION: <a few sentences>",
  "ACCEPTANCE:",
  "- <criterion>",
  "- <criterion>",
  "```",
].join("\n");

/**
 * The single `claude --print` prompt for one scoping turn. The assistant runs a
 * SHORT clarifying dialogue (1–3 targeted questions); once it has enough, it ENDS
 * its message with the exact fenced ```recap block above so the app can parse it
 * deterministically. Discussion only — explicitly no tool use / edits.
 */
export const improveChatPrompt = definePrompt<ImproveChatInput>({
  id: PromptId.ImproveChat,
  version: 1,
  build: (input) =>
    [
      "You are scoping a single self-improvement request for a desktop app.",
      `Request type: ${input.type} — ${TYPE_GUIDANCE[input.type]}.`,
      "",
      renderContext(input),
      "",
      "Conversation so far:",
      renderTranscript(input.transcript),
      "",
      "Your job is a SHORT scoping dialogue. If the request is still unclear, ask",
      "1–3 targeted clarifying questions (one short message). Discussion only — do",
      "NOT use tools, do NOT edit files.",
      "",
      "Once you have enough information, you may chat conversationally first, then",
      "END your message with EXACTLY this fenced block (no other fenced blocks):",
      "",
      RECAP_BLOCK_SPEC,
      "",
      "Write TITLE / DESCRIPTION / ACCEPTANCE in the SAME LANGUAGE as the user.",
      "Reply with just your next message to the user.",
    ].join("\n"),
});
