import { definePrompt, PromptId } from "./prompt.types";

/** Inputs for the one-shot conversation-title prompt. */
export type ConversationTitleInput = {
  userMessage: string;
  assistantMessage: string;
};

/**
 * One-shot conversation-title prompt. Moved verbatim from the inline string in
 * `conversation/title.service.generateConversationTitle` (the `.slice(0, 300)`
 * caps are part of building the prompt text, so they live here). Asks for a short
 * 3–6 word topic label with no quotes / punctuation / prefix.
 */
export const conversationTitlePrompt = definePrompt<ConversationTitleInput>({
  id: PromptId.ConversationTitle,
  version: 1,
  build: ({ userMessage, assistantMessage }) =>
    `You are labeling a conversation. Output ONLY a short topic label of 3-6 words. It is a label, not a sentence. No quotes, no trailing punctuation, no "Title:" prefix, no explanation — just the label text.

<conversation>
User: ${userMessage.slice(0, 300)}
Assistant: ${assistantMessage.slice(0, 300)}
</conversation>

Title:`,
});
