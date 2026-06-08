import { useEffect } from "react";
import { create } from "zustand";

import type { AgentContext, LiveEvent } from "@/types/events.types";

const DEFAULT_LIMIT = 200_000;
const ACTIVE_TIMEOUT_MS = 5000;

// Per-conversation presence status for one agent. Authoritative, finite state
// (CLAUDE.md: enum + behavior map, not a fallback chain). `idle` doubles as the
// absent/unknown case for an agent that was seen in the session but is neither
// active nor waiting right now.
export const AgentPresenceStatus = {
  Active: "active",
  Waiting: "waiting",
  Idle: "idle",
} as const;
export type AgentPresenceStatus =
  (typeof AgentPresenceStatus)[keyof typeof AgentPresenceStatus];

// Session-scoped presence: which sub-agents appeared in each conversation
// (keyed by the conversation's `session_id`) and their current status. This is
// the DURABLE record consumers scope against — it is NOT capped by the 200-event
// rolling buffer, so a tab never silently disappears once its events scroll off.
// Status here is per (session, agent), so an agent named "researcher" active in
// conversation B never makes conversation A's "researcher" pulse.
export type SessionPresence = Map<string, Map<string, AgentPresenceStatus>>;

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
  // Durable, session-scoped sub-agent presence (see SessionPresence). Survives
  // 200-event buffer eviction and keeps status from leaking across sessions.
  presence: SessionPresence;
  setConnected: (connected: boolean) => void;
  ingest: (raw: unknown) => void;
  expireActive: (agentName: string) => void;
};

// Set an agent's status for ONE session, cloning the touched maps so zustand
// subscribers re-render. Returns the next top-level presence map.
function setPresence(
  presence: SessionPresence,
  sessionId: string,
  agentName: string,
  status: AgentPresenceStatus,
): SessionPresence {
  const next: SessionPresence = new Map(presence);
  const inner = new Map(next.get(sessionId) ?? new Map<string, AgentPresenceStatus>());
  if (inner.get(agentName) === status) return presence;
  inner.set(agentName, status);
  next.set(sessionId, inner);
  return next;
}

// Apply a status to an agent across EVERY session where it is already present.
// Used by the name-only spawn channels (`spawn_usage`, `session_activity`,
// `spawn_input_request`, `spawn_exit`) which carry no session_id — the best
// available signal is to update the sessions that already saw this agent via the
// session-scoped `event` channel. New presence is only created from `event`.
function setPresenceByName(
  presence: SessionPresence,
  agentName: string,
  status: AgentPresenceStatus,
): SessionPresence {
  let next = presence;
  for (const [sessionId, inner] of presence) {
    if (inner.has(agentName)) {
      next = setPresence(next, sessionId, agentName, status);
    }
  }
  return next;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  connected: false,
  activeAgents: new Set(),
  agentContexts: new Map(),
  currentTools: new Map(),
  waitingAgents: new Set(),
  presence: new Map(),

  setConnected: (connected) => set({ connected }),

  expireActive: (agentName) =>
    set((s) => {
      const nextActive = new Set(s.activeAgents);
      nextActive.delete(agentName);
      const nextTools = new Map(s.currentTools);
      nextTools.delete(agentName);
      // Demote this agent to idle in every session where it was active, so the
      // session-scoped presence record matches the global active set's expiry.
      let nextPresence = s.presence;
      for (const [sessionId, inner] of s.presence) {
        if (inner.get(agentName) === AgentPresenceStatus.Active) {
          nextPresence = setPresence(
            nextPresence,
            sessionId,
            agentName,
            AgentPresenceStatus.Idle,
          );
        }
      }
      return { activeAgents: nextActive, currentTools: nextTools, presence: nextPresence };
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
      const sessionId = data.session_id;
      set((s) => ({
        events: [data, ...s.events].slice(0, 200),
        // Record durable, session-scoped presence from the ONE channel that
        // carries both session_id and agent_name. This is what tabs derive from
        // — not the rolling buffer — so a tab persists past event eviction.
        presence: sessionId
          ? setPresence(s.presence, sessionId, data.agent_name, AgentPresenceStatus.Active)
          : s.presence,
      }));
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
        const name = data.agentName;
        set((s) => {
          const next = new Set(s.waitingAgents);
          next.delete(name);
          return {
            waitingAgents: next,
            presence: setPresenceByName(s.presence, name, AgentPresenceStatus.Active),
          };
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
          return {
            waitingAgents: next,
            presence: setPresenceByName(s.presence, name, AgentPresenceStatus.Active),
          };
        });
      }
      return;
    }
    if (data.type === "spawn_input_request" && data.agentName) {
      const name = data.agentName;
      set((s) => ({
        waitingAgents: new Set(s.waitingAgents).add(name),
        presence: setPresenceByName(s.presence, name, AgentPresenceStatus.Waiting),
      }));
      return;
    }
    if (data.type === "spawn_exit" && data.agentName) {
      const name = data.agentName;
      set((s) => {
        const next = new Set(s.waitingAgents);
        next.delete(name);
        return {
          waitingAgents: next,
          presence: setPresenceByName(s.presence, name, AgentPresenceStatus.Idle),
        };
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
