/**
 * Pure prompt builder for the one-shot panel `transform` LLM call. No I/O — the
 * actual `claude --print` spawn lives in `transform.service.ts`, so this wiring
 * stays unit-testable.
 *
 * The transform is fully isolated from any chat conversation: it only ever sees
 * the `content` of a single panel tab plus the user's free-text `instruction`,
 * and the model is told to return ONLY the transformed artifact (no preamble,
 * no explanation) so the result can land back in the tab verbatim.
 */

/** The three transformable panel kinds. Mirrors `PanelTabKind` on the renderer. */
export const TransformKind = { Table: "table", Code: "code", Text: "text" } as const;
export type TransformKind = (typeof TransformKind)[keyof typeof TransformKind];

export type TransformInput = {
  kind: TransformKind;
  instruction: string;
  content: string;
};

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

/**
 * Build the full one-shot prompt fed to `claude --print` over stdin. Deterministic
 * and side-effect free: same input → same string.
 */
export function buildTransformPrompt({ kind, instruction, content }: TransformInput): string {
  return [
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
  ].join("\n");
}
