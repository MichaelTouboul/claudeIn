import { useCallback,useEffect, useState } from "react";

export type SessionStatus = "live" | "recent" | "idle";

export type SessionSummary = {
  sessionId: string;
  filePath: string;
  agentName: string | null;
  title: string | null;
  firstPrompt: string | null;
  messageCount: number;
  branch: string | null;
  startedAt: string | null;
  lastActiveAt: string | null;
  model: string | null;
  projectDirName: string;
  status: SessionStatus;
};

export type SessionConversation = {
  sessionId: string;
  messages: SessionMessage[];
  totalTokensIn: number;
  totalTokensOut: number;
  model: string | null;
};

export type SessionMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  uuid: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  toolNames?: string[];
};

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
