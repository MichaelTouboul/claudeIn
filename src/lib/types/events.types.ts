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

// Per-agent token/cost accumulation for the live tooltip. The context PERCENT is
// NOT held here — it is computed once in the backend from the session transcript
// and delivered per claudeSessionId via the `session_context` event (see
// `useEventsStore.sessionContexts`). Surfaces read that one value so the live
// agent bar and the persisted sidebar bar render an identical number.
export type AgentContext = {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
};
