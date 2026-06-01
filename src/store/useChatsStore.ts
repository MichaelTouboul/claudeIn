import { useEffect, useRef } from "react";
import { create } from "zustand";

import type { OpenChat } from "@/components/Workspace/types";

type ChatsState = {
  openChats: OpenChat[];
  addOpenChat: (agentName: string, title: string) => string;
  retitleByAgent: (agentName: string, title: string) => void;
};

let counter = 0;

export const useChatsStore = create<ChatsState>((set) => ({
  openChats: [],

  addOpenChat: (agentName, title) => {
    const id = `chat-${++counter}-${Date.now()}`;
    set((s) => ({
      openChats: [{ id, agentName, title, createdAt: Date.now(), isNew: true }, ...s.openChats],
    }));
    setTimeout(() => {
      set((s) => ({
        openChats: s.openChats.map((c) => (c.id === id ? { ...c, isNew: false } : c)),
      }));
    }, 600);
    return id;
  },

  retitleByAgent: (agentName, title) =>
    set((s) => ({
      openChats: s.openChats.map((c) =>
        c.agentName === agentName || c.agentName === "claude" ? { ...c, title } : c
      ),
    })),
}));

export function useInitChatTitles() {
  const pendingTitles = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const cleanup = window.api.onEvent((raw) => {
      const data = raw as { type: string; agentName?: string; message?: { role: string; content: string } };
      if (data.type !== "spawn_message" || !data.message?.content) return;
      const agent = data.agentName || "";
      const role = data.message.role;
      const content = data.message.content;

      if (role === "user") {
        const { openChats } = useChatsStore.getState();
        const hasGeneric = openChats.some(
          (c) =>
            (c.agentName === agent || c.agentName === "claude") &&
            (c.title === "New chat" || c.title.startsWith("Chat with "))
        );
        if (!hasGeneric || pendingTitles.current.has(agent)) return;

        pendingTitles.current.set(agent, content);
        let preview = content.replace(/[\n\r]+/g, " ").trim();
        if (preview.length > 40) preview = preview.slice(0, 37) + "...";
        useChatsStore.getState().retitleByAgent(agent, preview);
        return;
      }

      if (role === "assistant" && pendingTitles.current.has(agent)) {
        const userMsg = pendingTitles.current.get(agent)!;
        pendingTitles.current.delete(agent);
        void window.api.generateTitle(userMsg, content).then((title) => {
          if (title) useChatsStore.getState().retitleByAgent(agent, title);
        });
      }
    });
    return cleanup;
  }, []);
}
