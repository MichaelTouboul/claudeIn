import { useCallback,useEffect, useRef, useState } from "react";

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

type IPCEvent =
  | ({ type: 'event' } & LiveEvent)
  | { type: 'spawn_usage'; agentName: string; tokensIn?: number; tokensOut?: number }
  | { type: 'session_activity'; agentName?: string; tokensIn?: number; tokensOut?: number }
  | { type: 'spawn_input_request'; agentName?: string }
  | { type: 'spawn_exit'; agentName?: string };

const DEFAULT_LIMIT = 200_000;

export function useIPC() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());
  const [agentContexts, setAgentContexts] = useState<Map<string, AgentContext>>(new Map());
  const [currentTools, setCurrentTools] = useState<Map<string, string>>(new Map());
  const [waitingAgents, setWaitingAgents] = useState<Set<string>>(new Set());
  const activeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const markActive = useCallback((agentName: string, tokensIn: number, tokensOut: number, costUsd: number, toolName?: string) => {
    setActiveAgents((prev) => new Set(prev).add(agentName));

    if (tokensIn > 0 || tokensOut > 0) {
      setAgentContexts((prev) => {
        const next = new Map(prev);
        const existing = next.get(agentName) || { tokensIn: 0, tokensOut: 0, costUsd: 0, percent: 0 };
        const newIn = existing.tokensIn + tokensIn;
        const newOut = existing.tokensOut + tokensOut;
        const total = newIn + newOut;
        next.set(agentName, {
          tokensIn: newIn,
          tokensOut: newOut,
          costUsd: existing.costUsd + costUsd,
          percent: Math.min((total / DEFAULT_LIMIT) * 100, 100),
        });
        return next;
      });
    }

    if (toolName) {
      setCurrentTools((prev) => {
        const next = new Map(prev);
        next.set(agentName, toolName);
        return next;
      });
    }

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
        setCurrentTools((prev) => {
          const next = new Map(prev);
          next.delete(agentName);
          return next;
        });
        activeTimers.current.delete(agentName);
      }, 5000)
    );
  }, []);

  useEffect(() => {
    setConnected(true);
    const cleanup = window.api.onEvent((raw) => {
      const data = raw as IPCEvent;
      if (data.type === "event") {
        setEvents((prev) => [data, ...prev].slice(0, 200));
        markActive(data.agent_name, data.tokens_in || 0, data.tokens_out || 0, data.cost_usd || 0, data.tool_name || undefined);
      }
      if (data.type === "spawn_usage") {
        markActive(data.agentName, data.tokensIn || 0, data.tokensOut || 0, 0);
        if (data.agentName) {
          setWaitingAgents((prev) => {
            const next = new Set(prev);
            next.delete(data.agentName);
            return next;
          });
        }
      }
      if (data.type === "session_activity") {
        markActive(data.agentName || "unknown", data.tokensIn || 0, data.tokensOut || 0, 0);
        if (data.agentName) {
          const name = data.agentName;
          setWaitingAgents((prev) => {
            const next = new Set(prev);
            next.delete(name);
            return next;
          });
        }
      }
      if (data.type === "spawn_input_request" && data.agentName) {
        const name = data.agentName;
        setWaitingAgents((prev) => new Set(prev).add(name));
      }
      if (data.type === "spawn_exit" && data.agentName) {
        const name = data.agentName;
        setWaitingAgents((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      }
    });
    return cleanup;
  }, [markActive]);

  return { events, connected, activeAgents, agentContexts, currentTools, waitingAgents };
}
