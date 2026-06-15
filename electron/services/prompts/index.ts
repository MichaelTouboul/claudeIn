/**
 * Centralized prompt registry (PromptLayer-style, fully local — no external
 * service). Every LLM prompt the app pipes to `claude --print` is defined once
 * here behind a stable `PromptId` + `version`. Call sites use the individual
 * typed exports via `renderPrompt(...)`; `PROMPTS` enables iteration/observability
 * over the whole set (e.g. the registry test).
 */
import type { Prompt, PromptId } from "./prompt.types";
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
export const PROMPTS: Record<PromptId, Prompt<unknown>> = {
  [repoLabelPrompt.id]: repoLabelPrompt as Prompt<unknown>,
  [userProfilePrompt.id]: userProfilePrompt as Prompt<unknown>,
  [scopeProfilePrompt.id]: scopeProfilePrompt as Prompt<unknown>,
  [panelTransformPrompt.id]: panelTransformPrompt as Prompt<unknown>,
  [improveChatPrompt.id]: improveChatPrompt as Prompt<unknown>,
  [conversationTitlePrompt.id]: conversationTitlePrompt as Prompt<unknown>,
};
