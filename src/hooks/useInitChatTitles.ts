import { useEffect, useRef } from 'react';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

type SpawnMessageEvent = {
  type: string;
  agentName?: string;
  message?: { role: string; content: string };
};

// Generates conversation titles from the live spawn stream and propagates the
// result to the visible InternalTab (and, through it, the sidebar
// ConversationList). The flow is one-shot per conversation:
//   • first user message → recorded only (the tab keeps its generic 'Chat'
//     label so it stays overwritable; the raw prompt is never shown as a title),
//   • the assistant reply → an AI title via window.api.generateTitle, applied
//     through retitleChatTab.
// retitleChatTab only overwrites generic placeholder titles, so a tab the user
// renamed — or one already given an AI title — is never clobbered. On failure
// generateTitle resolves to "" and the tab simply stays 'Chat'.
export function useInitChatTitles() {
  const pendingTitles = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const retitle = useWorkspaceStore.getState().retitleChatTab;
    const cleanup = window.api.onEvent((raw) => {
      const data = raw as SpawnMessageEvent;
      if (data.type !== 'spawn_message' || !data.message?.content) return;
      const agent = data.agentName || '';
      const { role, content } = data.message;

      if (role === 'user') {
        if (pendingTitles.current.has(agent)) return;
        pendingTitles.current.set(agent, content);
        return;
      }

      if (role === 'assistant' && pendingTitles.current.has(agent)) {
        const userMsg = pendingTitles.current.get(agent)!;
        pendingTitles.current.delete(agent);
        void window.api.generateTitle(userMsg, content).then((title) => {
          if (title) retitle(agent, title);
        });
      }
    });
    return cleanup;
  }, []);
}
