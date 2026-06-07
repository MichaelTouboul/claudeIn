import { useCallback,useEffect, useState } from "react";

import type {
  SessionConversation,
  SessionSummary,
} from "@/types/session.types";

// Re-export the session type family from its single source of truth
// (electron/types/session.types, via @/types/session.types) so existing
// `@/hooks/useSessions` consumers keep working without duplicating the shapes.
export type {
  SessionConversation,
  SessionMessage,
  SessionStatus,
  SessionSummary,
} from "@/types/session.types";

export function useSessions(projectPath: string | null) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<SessionConversation | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    const data = await window.api.getSessionList(projectPath);
    setSessions(data);
    setLoading(false);
  }, [projectPath]);

  useEffect(() => { refresh(); }, [refresh]);

  const selectSession = useCallback(async (filePath: string) => {
    setConversationLoading(true);
    const data = await window.api.getSessionConversation(filePath);
    setConversation(data);
    setConversationLoading(false);
  }, []);

  const clearConversation = useCallback(() => {
    setConversation(null);
  }, []);

  return { sessions, loading, conversation, conversationLoading, selectSession, clearConversation, refresh };
}
