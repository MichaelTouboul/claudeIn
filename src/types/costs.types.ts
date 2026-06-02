export type CostsSummary = {
  tokens_in_today: string;
  tokens_out_today: string;
  cost_today: number;
  tokens_in_7d: string;
  tokens_out_7d: string;
  cost_7d: number;
  tokens_in_30d: string;
  tokens_out_30d: string;
  cost_30d: number;
  tokens_in_all: string;
  tokens_out_all: string;
  cost_all: number;
};

export type CostsByDay = {
  day: string;
  tokens_in: string;
  tokens_out: string;
  cost_usd: number;
  events_count: string;
};

export type CostsByAgent = {
  agent_name: string;
  tokens_in: string;
  tokens_out: string;
  cost_usd: number;
  events_count: string;
  active_days: string;
  last_seen: string;
};

export type CostsByTool = {
  tool_name: string;
  tokens_in: string;
  tokens_out: string;
  cost_usd: number;
  call_count: string;
};

export type CostsByModel = {
  model: string;
  tokens_in: string;
  tokens_out: string;
  cost_usd: number;
  events_count: string;
};
