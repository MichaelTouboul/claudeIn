export type LiveEvent = {
  id: number;
  agent_name: string;
  session_id: string | null;
  event_type: string;
  tool_name: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
};

export type AgentContext = {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  percent: number;
};
