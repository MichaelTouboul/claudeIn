import { useState, useEffect, useCallback } from "react";
import type { AgentFile } from "../types/agent.types";
import { api } from "../services/api";

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
    } catch (err: any) {
      setError(err.message);
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
