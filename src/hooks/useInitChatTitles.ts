import { useEffect } from 'react';

import { useConversationTitlesStore } from '@/store/dashboard/useConversationTitlesStore';

type ConversationTitledEvent = {
  type?: string;
  claudeSessionId?: string;
  title?: string;
};

// Thin listener: the backend generates a conversation's AI title on the first
// assistant reply and broadcasts `conversation_titled` keyed by claudeSessionId.
// We mirror that into the titles store; the sidebar rows and the open chat tab
// read it live, with no refetch.
export function useInitChatTitles() {
  useEffect(() => {
    const cleanup = window.api.onEvent((raw) => {
      const data = raw as ConversationTitledEvent;
      if (data.type !== 'conversation_titled' || !data.claudeSessionId || !data.title) return;
      useConversationTitlesStore.getState().setAiTitle(data.claudeSessionId, data.title);
    });
    return cleanup;
  }, []);
}
