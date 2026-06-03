import { useEffect, useRef } from 'react';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

type SpawnMessageEvent = {
  type: string;
  agentName?: string;
  message?: { role: string; content: string };
};

const PREVIEW_MAX = 40;
const PREVIEW_CUT = 37;

function toPreview(content: string): string {
  const preview = content.replace(/[\n\r]+/g, ' ').trim();
  return preview.length > PREVIEW_MAX ? `${preview.slice(0, PREVIEW_CUT)}...` : preview;
}

// Generates conversation titles from the live spawn stream and propagates them
// to the visible InternalTab (and, through it, the sidebar ConversationList):
//   • first user message → an instant preview title,
//   • the assistant reply → an AI-generated title via window.api.generateTitle.
// retitleChatTab only overwrites generic placeholder titles, so a tab the user
// renamed is never clobbered.
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
        retitle(agent, toPreview(content));
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
