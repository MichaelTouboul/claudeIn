export type ChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolName?: string;
  timestamp: string;
};

export type SpawnSession = {
  id: string;
  agentName: string;
  mission: string;
  status: "running" | "done" | "failed";
  pid: number | null;
  startedAt: string;
  messages: ChatMessage[];
};
