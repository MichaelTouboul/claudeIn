import { useCallback,useEffect, useState } from "react";

export type Stats = {
  active_sessions: string;
  total_events: string;
  total_tokens_in: string;
  total_tokens_out: string;
  total_cost: number;
  events_today: string;
  cost_today: number;
};

export type AgentStats = {
  agent_name: string;
  events_count: string;
  tokens_in: string;
  tokens_out: string;
  cost_usd: number;
  last_active: string;
};

export function useStats(refreshTrigger?: number) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        fetch("/api/events/stats").then((r) => r.json()),
        fetch("/api/events/stats/agents").then((r) => r.json()),
      ]);
      setStats(s);
      setAgentStats(a);
    } catch {
      // stats endpoint may not be available; ignore silently
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshTrigger]);

  return { stats, agentStats, refresh };
}
