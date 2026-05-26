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
