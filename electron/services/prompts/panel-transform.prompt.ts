import { definePrompt, PromptId } from "./prompt.types";
import { TransformKind, type TransformInput } from "../transform/transform.types";

/**
 * One-shot panel `transform` prompt. Moved verbatim from
 * `transform.prompt.buildTransformPrompt`: the model is told to return ONLY the
 * transformed artifact (no preamble) so the result lands back in the tab as-is.
 * Domain types (`TransformKind`/`TransformInput`) live in `transform.types`.
 */

/**
 * Per-kind output contract appended to the prompt. Modeled as a value→behavior
 * map (CLAUDE.md: enum + behavior map, no fallback chain) so adding a kind is a
 * single entry, not a new branch.
 */
const OUTPUT_CONTRACT: Record<TransformKind, string> = {
  [TransformKind.Table]:
    "Return ONLY a GitHub-Flavored-Markdown table (a header row, a separator row of dashes, then the data rows). No prose before or after it, no code fences.",
  [TransformKind.Code]:
    "Return ONLY the transformed code. No prose, no explanation, no markdown code fences — just the raw code.",
  [TransformKind.Text]:
    "Return ONLY the transformed text as Markdown. No preamble, no explanation about what you changed.",
};

const SOURCE_LABEL: Record<TransformKind, string> = {
  [TransformKind.Table]: "table (as Markdown)",
  [TransformKind.Code]: "code",
  [TransformKind.Text]: "text",
};

export const panelTransformPrompt = definePrompt<TransformInput>({
  id: PromptId.PanelTransform,
  version: 1,
  build: ({ kind, instruction, content }) =>
    [
      `You are a deterministic document transformer working on a single piece of ${SOURCE_LABEL[kind]}.`,
      `Apply the user's instruction to the source and output the result. ${OUTPUT_CONTRACT[kind]}`,
      "",
      "<instruction>",
      instruction.trim(),
      "</instruction>",
      "",
      "<source>",
      content,
      "</source>",
    ].join("\n"),
});
