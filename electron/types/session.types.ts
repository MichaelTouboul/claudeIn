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
  // Best-effort context-window fill (0–100) from the LAST assistant turn's
  // usage in the transcript; null when no assistant usage was recorded.
  contextPercent: number | null;
  projectDirName: string;
  status: SessionStatus;
  pinned: boolean;
  archived: boolean;
  pinnedAt: string | null;
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
