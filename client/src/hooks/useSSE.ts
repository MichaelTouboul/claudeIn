import { useState, useEffect, useRef, useCallback } from "react";

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

export function useSSE() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());
  const activeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const markActive = useCallback((agentName: string) => {
    setActiveAgents((prev) => new Set(prev).add(agentName));

    const existing = activeTimers.current.get(agentName);
    if (existing) clearTimeout(existing);

    activeTimers.current.set(
      agentName,
      setTimeout(() => {
        setActiveAgents((prev) => {
          const next = new Set(prev);
          next.delete(agentName);
          return next;
        });
        activeTimers.current.delete(agentName);
      }, 5000)
    );
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");

    source.onopen = () => setConnected(true);

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "connected") return;
        if (data.type === "event") {
          const event: LiveEvent = data;
          setEvents((prev) => [event, ...prev].slice(0, 200));
          markActive(event.agent_name);
        }
      } catch {}
    };

    source.onerror = () => setConnected(false);

    return () => source.close();
  }, [markActive]);

  return { events, connected, activeAgents };
}
