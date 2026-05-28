import { useCallback,useEffect, useState } from "react";

import { api } from "../services/api";
import type { AgentFile } from "../types/agent.types";

export function useAgents() {
  const [agents, setAgents] = useState<AgentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAgents();
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteAgent = useCallback(
    async (name: string) => {
      await api.deleteAgent(name);
      await refresh();
    },
    [refresh]
  );

  return { agents, loading, error, refresh, deleteAgent };
}
