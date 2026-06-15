/**
 * PromptLayer-style prompt registry — foundation types.
 *
 * Every LLM prompt piped to `claude --print` is centralized here behind a stable
 * `PromptId` + a `version`. A prompt is a pure `build(input) => string`; the call
 * site renders it through `render.ts` so we get a single observability seam over
 * every prompt. This is a purely internal refactor — the produced strings are
 * byte-identical to the per-domain builders they replace.
 */

/**
 * Stable, kebab-cased prompt identifiers. Modeled as an `as const` object + type
 * (CLAUDE.md enum rule): the ids are used across 3+ files AND the registry needs
 * a runtime object to iterate (`Object.values`), so this qualifies as a real enum.
 */
export const PromptId = {
  RepoLabel: "repo-label",
  UserProfileNarrative: "user-profile-narrative",
  ScopeProfile: "scope-profile",
  PanelTransform: "panel-transform",
  ImproveChat: "improve-chat",
  ConversationTitle: "conversation-title",
} as const;
export type PromptId = (typeof PromptId)[keyof typeof PromptId];

/**
 * A registered prompt: a stable `id`, a monotonically bumped `version`, and a
 * pure `build` that turns its typed `Input` into the exact string fed to the LLM.
 */
export interface Prompt<Input> {
  id: PromptId;
  version: number;
  build: (input: Input) => string;
}

/**
 * Identity helper that registers a prompt definition. Kept minimal but real: it
 * is the single seam where a prompt's `id`/`version` are attached to its builder,
 * so every prompt in the app flows through one definition site.
 */
export function definePrompt<Input>(def: Prompt<Input>): Prompt<Input> {
  return def;
}
