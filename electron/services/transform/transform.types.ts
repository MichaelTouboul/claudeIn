/**
 * Domain types for the one-shot panel `transform` LLM call. Kept in the transform
 * domain (not in the centralized prompt file) so the IPC layer and service can
 * import them without depending on `services/prompts`.
 */

/** The three transformable panel kinds. Mirrors `PanelTabKind` on the renderer. */
export const TransformKind = { Table: "table", Code: "code", Text: "text" } as const;
export type TransformKind = (typeof TransformKind)[keyof typeof TransformKind];

export type TransformInput = {
  kind: TransformKind;
  instruction: string;
  content: string;
};
