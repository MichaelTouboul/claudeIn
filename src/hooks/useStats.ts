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

export function useStats(refreshTrigger?: number) {
  const [stats, setStats] = useState<Stats | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await window.api.getStats();
      setStats(s);
    } catch {
      // stats may not be available; ignore silently
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshTrigger]);

  return { stats, refresh };
}
