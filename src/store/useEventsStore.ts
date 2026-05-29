import { useEffect } from "react";
import { create } from "zustand";

import type { AgentContext, LiveEvent } from "@/types/events.types";

const DEFAULT_LIMIT = 200_000;
const ACTIVE_TIMEOUT_MS = 5000;

type IPCEvent =
  | ({ type: "event" } & LiveEvent)
  | { type: "spawn_usage"; agentName: string; tokensIn?: number; tokensOut?: number }
  | { type: "session_activity"; agentName?: string; tokensIn?: number; tokensOut?: number }
  | { type: "spawn_input_request"; agentName?: string }
  | { type: "spawn_exit"; agentName?: string };

type EventsState = {
  events: LiveEvent[];
  connected: boolean;
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
  currentTools: Map<string, string>;
  waitingAgents: Set<string>;
  setConnected: (connected: boolean) => void;
  ingest: (raw: unknown) => void;
  expireActive: (agentName: string) => void;
};

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  connected: false,
  activeAgents: new Set(),
  agentContexts: new Map(),
  currentTools: new Map(),
  waitingAgents: new Set(),

  setConnected: (connected) => set({ connected }),

  expireActive: (agentName) =>
    set((s) => {
      const nextActive = new Set(s.activeAgents);
      nextActive.delete(agentName);
      const nextTools = new Map(s.currentTools);
      nextTools.delete(agentName);
      return { activeAgents: nextActive, currentTools: nextTools };
    }),

  ingest: (raw) => {
    const data = raw as IPCEvent;
    const markActive = (
      agentName: string,
      tokensIn: number,
      tokensOut: number,
      costUsd: number,
      toolName?: string
    ) => {
      const s = get();
      const nextActive = new Set(s.activeAgents).add(agentName);

      let nextContexts = s.agentContexts;
      if (tokensIn > 0 || tokensOut > 0) {
        nextContexts = new Map(s.agentContexts);
        const existing =
          nextContexts.get(agentName) || { tokensIn: 0, tokensOut: 0, costUsd: 0, percent: 0 };
        const newIn = existing.tokensIn + tokensIn;
        const newOut = existing.tokensOut + tokensOut;
        const total = newIn + newOut;
        nextContexts.set(agentName, {
          tokensIn: newIn,
          tokensOut: newOut,
          costUsd: existing.costUsd + costUsd,
          percent: Math.min((total / DEFAULT_LIMIT) * 100, 100),
        });
      }

      let nextTools = s.currentTools;
      if (toolName) {
        nextTools = new Map(s.currentTools);
        nextTools.set(agentName, toolName);
      }

      set({ activeAgents: nextActive, agentContexts: nextContexts, currentTools: nextTools });

      const existingTimer = activeTimers.get(agentName);
      if (existingTimer) clearTimeout(existingTimer);
      activeTimers.set(
        agentName,
        setTimeout(() => {
          activeTimers.delete(agentName);
          get().expireActive(agentName);
        }, ACTIVE_TIMEOUT_MS)
      );
    };

    if (data.type === "event") {
      set((s) => ({ events: [data, ...s.events].slice(0, 200) }));
      markActive(
        data.agent_name,
        data.tokens_in || 0,
        data.tokens_out || 0,
        data.cost_usd || 0,
        data.tool_name || undefined
      );
      return;
    }
    if (data.type === "spawn_usage") {
      markActive(data.agentName, data.tokensIn || 0, data.tokensOut || 0, 0);
      if (data.agentName) {
        set((s) => {
          const next = new Set(s.waitingAgents);
          next.delete(data.agentName);
          return { waitingAgents: next };
        });
      }
      return;
    }
    if (data.type === "session_activity") {
      markActive(data.agentName || "unknown", data.tokensIn || 0, data.tokensOut || 0, 0);
      if (data.agentName) {
        const name = data.agentName;
        set((s) => {
          const next = new Set(s.waitingAgents);
          next.delete(name);
          return { waitingAgents: next };
        });
      }
      return;
    }
    if (data.type === "spawn_input_request" && data.agentName) {
      const name = data.agentName;
      set((s) => ({ waitingAgents: new Set(s.waitingAgents).add(name) }));
      return;
    }
    if (data.type === "spawn_exit" && data.agentName) {
      const name = data.agentName;
      set((s) => {
        const next = new Set(s.waitingAgents);
        next.delete(name);
        return { waitingAgents: next };
      });
    }
  },
}));

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function useInitEvents() {
  useEffect(() => {
    useEventsStore.getState().setConnected(true);
    const cleanup = window.api.onEvent((raw) => {
      useEventsStore.getState().ingest(raw);
    });
    return () => {
      cleanup();
      for (const timer of activeTimers.values()) clearTimeout(timer);
      activeTimers.clear();
      useEventsStore.getState().setConnected(false);
    };
  }, []);
}
