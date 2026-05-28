import { useEffect, useRef } from 'react';

import type { OpenChat } from '@/components/ProjectDashboard/types';

export type UseAutoChatTitlesArgs = {
  setOpenChats: React.Dispatch<React.SetStateAction<OpenChat[]>>;
};

export function useAutoChatTitles({ setOpenChats }: UseAutoChatTitlesArgs) {
  const pendingTitles = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const cleanup = window.api.onEvent((raw) => {
      const data = raw as {
        type: string;
        agentName?: string;
        message?: { role: string; content: string };
      };

      if (data.type === 'spawn_message' && data.message?.content) {
        const agent: string = data.agentName || '';
        const role: string = data.message.role;
        const content: string = data.message.content;

        if (role === 'user') {
          setOpenChats((prev) => {
            const hasGeneric = prev.some(
              (c) =>
                (c.agentName === agent || c.agentName === 'claude') &&
                (c.title === 'New chat' || c.title.startsWith('Chat with '))
            );
            if (!hasGeneric || pendingTitles.current.has(agent)) return prev;

            pendingTitles.current.set(agent, content);

            let preview = content.replace(/[\n\r]+/g, ' ').trim();
            if (preview.length > 40) preview = preview.slice(0, 37) + '...';

            return prev.map((c) =>
              (c.agentName === agent || c.agentName === 'claude') &&
              (c.title === 'New chat' || c.title.startsWith('Chat with '))
                ? { ...c, title: preview }
                : c
            );
          });
        }

        if (role === 'assistant' && pendingTitles.current.has(agent)) {
          const userMsg = pendingTitles.current.get(agent)!;
          pendingTitles.current.delete(agent);

          window.api.generateTitle(userMsg, content).then((title) => {
            if (title) {
              setOpenChats((prev) =>
                prev.map((c) =>
                  c.agentName === agent || c.agentName === 'claude'
                    ? { ...c, title }
                    : c
                )
              );
            }
          });
        }
      }
    });
    return cleanup;
  }, [setOpenChats]);
}
