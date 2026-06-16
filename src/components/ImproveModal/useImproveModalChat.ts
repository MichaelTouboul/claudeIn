import { useCallback, useState } from 'react';

import type { ImproveContextTarget, ImproveType } from '@/lib/types';
import { api } from '@/services/api';

import type { ChatMessage } from './types';

let seq = 0;
const nextId = (): string => `msg-${Date.now()}-${seq++}`;

type UseImproveModalChat = {
  messages: ChatMessage[];
  loading: boolean;
  send: (text: string, images?: string[]) => Promise<void>;
};

/**
 * Owns the modal's scoping-chat turns: append the user message, call
 * `improve:chat` with the running transcript + type/target context, then append
 * the assistant reply. Local to the modal (its own state lives and dies with it).
 */
export function useImproveModalChat(
  type: ImproveType,
  target: ImproveContextTarget | null,
): UseImproveModalChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(
    async (text: string, images?: string[]) => {
      const userTurn: ChatMessage = {
        id: nextId(),
        role: 'user',
        text,
        ...(images && images.length > 0 ? { images } : {}),
      };
      const transcript = [...messages, userTurn].map((m) => ({
        role: m.role,
        text: m.text,
        ...(m.images && m.images.length > 0 ? { images: m.images } : {}),
      }));
      setMessages((prev) => [...prev, userTurn]);
      setLoading(true);
      try {
        const reply = await api.improveChat({
          type,
          component: target?.component,
          sourcePath: target?.sourcePath,
          transcript,
        });
        setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: reply }]);
      } finally {
        setLoading(false);
      }
    },
    [messages, type, target],
  );

  return { messages, loading, send };
}
