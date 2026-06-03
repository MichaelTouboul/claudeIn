import { useCallback, useEffect, useRef, useState } from "react";

import type { SessionConversation, SessionMessage } from "./useSessions";

export type ConversationLoadState = "loading" | "loaded" | "not-found";

type TailState = {
  messages: SessionMessage[];
  meta: Omit<SessionConversation, "messages"> | null;
  state: ConversationLoadState;
};

/**
 * Read-only conversation viewer state: initial load via `getSessionConversation`,
 * then the live-tail (`watchConversation` + `onConversationAppended`). Appended
 * deltas are deduped by `uuid` and scoped to this `filePath`; other files'
 * appends are ignored. `unwatchConversation` runs on filePath change / unmount.
 * First consumer of the `conversation.tail` backend.
 */
export function useConversationTail(filePath: string): TailState {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [meta, setMeta] = useState<Omit<SessionConversation, "messages"> | null>(null);
  const [state, setState] = useState<ConversationLoadState>("loading");

  const seenRef = useRef<Set<string>>(new Set());

  const appendDedup = useCallback((incoming: SessionMessage[]) => {
    setMessages((prev) => {
      const fresh = incoming.filter((m) => !seenRef.current.has(m.uuid));
      if (fresh.length === 0) return prev;
      for (const m of fresh) seenRef.current.add(m.uuid);
      return [...prev, ...fresh];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    seenRef.current = new Set();
    setMessages([]);
    setMeta(null);
    setState("loading");

    void window.api
      .getSessionConversation(filePath)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setState("not-found");
          return;
        }
        const { messages: msgs, ...rest } = data;
        for (const m of msgs) seenRef.current.add(m.uuid);
        setMessages(msgs);
        setMeta(rest);
        setState("loaded");
      })
      .catch(() => {
        if (!cancelled) setState("not-found");
      });

    void window.api.watchConversation(filePath);
    const off = window.api.onConversationAppended((data) => {
      if (cancelled) return;
      if (data.filePath !== filePath) return;
      appendDedup(data.messages);
    });

    return () => {
      cancelled = true;
      off();
      void window.api.unwatchConversation(filePath);
    };
  }, [filePath, appendDedup]);

  return { messages, meta, state };
}
