/**
 * Centralized prompt registry (PromptLayer-style, fully local — no external
 * service). Every LLM prompt the app pipes to `claude --print` is defined once
 * here behind a stable `PromptId` + `version`. Call sites use the individual
 * typed exports via `renderPrompt(...)`; `PROMPTS` enables iteration/observability
 * over the whole set (e.g. the registry test).
 */
import { PromptId, type Prompt } from "./prompt.types";
import { repoLabelPrompt } from "./repo-label.prompt";
import { userProfilePrompt } from "./user-profile.prompt";
import { scopeProfilePrompt } from "./scope-profile.prompt";
import { panelTransformPrompt } from "./panel-transform.prompt";
import { improveChatPrompt } from "./improve-chat.prompt";
import { conversationTitlePrompt } from "./conversation-title.prompt";

export { PromptId, definePrompt } from "./prompt.types";
export type { Prompt } from "./prompt.types";
export { renderPrompt } from "./render";

export { repoLabelPrompt } from "./repo-label.prompt";
export type { RepoLabelInput } from "./repo-label.prompt";
export { userProfilePrompt } from "./user-profile.prompt";
export { scopeProfilePrompt } from "./scope-profile.prompt";
export { panelTransformPrompt } from "./panel-transform.prompt";
export { improveChatPrompt } from "./improve-chat.prompt";
export { conversationTitlePrompt } from "./conversation-title.prompt";
export type { ConversationTitleInput } from "./conversation-title.prompt";

/**
 * The full registry: every `PromptId` → its definition. The defs are cast to
 * `Prompt<unknown>` for this enumeration map only — call sites use the typed
 * individual exports above. Enables observability/iteration over all prompts.
 */
// Keys are the literal `PromptId.X` values (not `prompt.id`, which widens to the
// `PromptId` union and degrades the literal into a string index signature — that
// makes the object fail to satisfy `Record<PromptId, …>`). Runtime-identical, since
// each prompt is defined with the matching `id: PromptId.X`.
export const PROMPTS: Record<PromptId, Prompt<unknown>> = {
  [PromptId.RepoLabel]: repoLabelPrompt as Prompt<unknown>,
  [PromptId.UserProfileNarrative]: userProfilePrompt as Prompt<unknown>,
  [PromptId.ScopeProfile]: scopeProfilePrompt as Prompt<unknown>,
  [PromptId.PanelTransform]: panelTransformPrompt as Prompt<unknown>,
  [PromptId.ImproveChat]: improveChatPrompt as Prompt<unknown>,
  [PromptId.ConversationTitle]: conversationTitlePrompt as Prompt<unknown>,
};
