import { create } from "zustand";

export type ConversationTitle = {
  aiTitle: string | null;
  userTitle: string | null;
};

type ConversationTitlesState = {
  // Keyed by claudeSessionId (the on-disk `.jsonl` session id).
  conversationTitles: Record<string, ConversationTitle>;
  setAiTitle: (claudeSessionId: string, title: string) => void;
  setUserTitle: (claudeSessionId: string, title: string) => void;
};

export const useConversationTitlesStore = create<ConversationTitlesState>((set) => ({
  conversationTitles: {},

  setAiTitle: (claudeSessionId, title) =>
    set((s) => ({
      conversationTitles: {
        ...s.conversationTitles,
        [claudeSessionId]: {
          // Preserve any user-set title; only update the AI-generated one.
          userTitle: s.conversationTitles[claudeSessionId]?.userTitle ?? null,
          aiTitle: title,
        },
      },
    })),

  setUserTitle: (claudeSessionId, title) =>
    set((s) => ({
      conversationTitles: {
        ...s.conversationTitles,
        [claudeSessionId]: {
          // Preserve the AI title; an empty/whitespace title clears the user one
          // so the row falls back to the AI title.
          aiTitle: s.conversationTitles[claudeSessionId]?.aiTitle ?? null,
          userTitle: title.trim() === "" ? null : title.trim(),
        },
      },
    })),
}));
