export type SpawnSession = {
  id: string;
  agentName: string;
  mission: string;
  status: "running" | "done" | "failed";
  pid: number | null;
  startedAt: string;
  messages: ChatMessage[];
  claudeSessionId?: string;
};

export type ChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolName?: string;
  timestamp: string;
};

export type StreamEvent = {
  type: string;
  subtype?: string;
  session_id?: string;
  model?: string;
  message?: {
    role: string;
    content: Array<{ type: string; text?: string; name?: string; input?: unknown }>;
    usage?: { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
  };
  tool_use_id?: string;
  name?: string;
  input?: unknown;
  content?: Array<{ type: string; text?: string }>;
  result?: unknown;
  usage?: { input_tokens?: number; output_tokens?: number };
  [key: string]: unknown;
};
