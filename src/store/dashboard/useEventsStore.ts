import { useEffect } from "react";
import { create } from "zustand";

import type { AgentContext, LiveEvent } from "@/lib/types";

// NB: the agent → backend-percent selector `contextPercentForAgent` lives in the
// sibling `sessionContext.ts` (keeps this file under the 300-line limit). Import
// it from there.

const ACTIVE_TIMEOUT_MS = 5000;
// A sub-agent that asked for input but never resolved (no `spawn_usage`,
// `session_activity`, or `spawn_exit`) — e.g. its process was killed — would
// otherwise stay `Waiting` forever, since no other code path can clear it. After
// this idle window with no further signal, the watchdog demotes it to Idle so a
// dead agent's dot can't blink "waiting" indefinitely. Generous vs the 5s active
// window because a genuine input prompt may legitimately wait on the user.
const WAITING_TIMEOUT_MS = 45_000;

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

// Latest event `seq` (monotonic `LiveEvent.id`) seen per (session, agent). Fed
// ONLY by the `event` channel — the one signal that carries both `session_id`
// and `id` — so it is a faithful, durable high-water mark. Consumers compare it
// against a dismissed seq to decide whether a dismissed tab should REAPPEAR
// (latest seq strictly greater than dismissed → a newer event arrived).
export type SessionPresenceSeq = Map<string, Map<string, number>>;

type IPCEvent =
  | ({ type: "event" } & LiveEvent)
  | { type: "spawn_usage"; agentName: string; tokensIn?: number; tokensOut?: number }
  | { type: "session_activity"; agentName?: string; tokensIn?: number; tokensOut?: number }
  | { type: "spawn_input_request"; agentName?: string }
  | { type: "spawn_exit"; agentName?: string; claudeSessionId?: string }
  // Backend-computed context %, keyed by claudeSessionId. This is the ONE source
  // of the bar percentage — the renderer never computes it (no token limit here).
  | { type: "session_context"; claudeSessionId: string; percent: number };

type EventsState = {
  events: LiveEvent[];
  connected: boolean;
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
  // Backend-computed context % per claudeSessionId (the `session_context` event).
  // The SINGLE source of every live bar's percentage — consumed directly by the
  // sidebar row (keyed by claudeSessionId) and, via `presence`, by the agent row.
  sessionContexts: Map<string, number>;
  currentTools: Map<string, string>;
  waitingAgents: Set<string>;
  // Durable, session-scoped sub-agent presence (see SessionPresence). Survives
  // 200-event buffer eviction and keeps status from leaking across sessions.
  presence: SessionPresence;
  // Latest event seq per (session, agent) — drives dismiss reappear-on-newer.
  presenceSeq: SessionPresenceSeq;
  setConnected: (connected: boolean) => void;
  ingest: (raw: unknown) => void;
  // Seed the persisted context % for a conversation (keyed by claudeSessionId)
  // the instant it is displayed, so the header + composer bar show the real
  // usage immediately — before any live `session_context` event arrives (those
  // only fire for a currently-running session). Never clobbers an existing value:
  // a live percent already in the map wins over a persisted snapshot.
  seedSessionContext: (claudeSessionId: string, percent: number | null) => void;
  expireActive: (agentName: string) => void;
  // Watchdog: demote a still-`Waiting` agent to Idle (see WAITING_TIMEOUT_MS).
  expireWaiting: (agentName: string) => void;
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

// Record the latest seq for one (session, agent), keeping the MAX so an
// out-of-order event can never lower the high-water mark. Clones the touched
// maps so zustand subscribers re-render. Returns the next top-level seq map.
function setPresenceSeq(
  presenceSeq: SessionPresenceSeq,
  sessionId: string,
  agentName: string,
  seq: number,
): SessionPresenceSeq {
  const inner = presenceSeq.get(sessionId);
  if (inner && (inner.get(agentName) ?? -Infinity) >= seq) return presenceSeq;
  const next: SessionPresenceSeq = new Map(presenceSeq);
  const nextInner = new Map(inner ?? new Map<string, number>());
  nextInner.set(agentName, seq);
  next.set(sessionId, nextInner);
  return next;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  connected: false,
  activeAgents: new Set(),
  agentContexts: new Map(),
  sessionContexts: new Map(),
  currentTools: new Map(),
  waitingAgents: new Set(),
  presence: new Map(),
  presenceSeq: new Map(),

  setConnected: (connected) => set({ connected }),

  seedSessionContext: (claudeSessionId, percent) =>
    set((s) => {
      // null = unknown (brand-new/empty conversation) → nothing to seed.
      if (percent === null) return {};
      // A live `session_context` value is authoritative; never overwrite it.
      if (s.sessionContexts.has(claudeSessionId)) return {};
      const next = new Map(s.sessionContexts);
      next.set(claudeSessionId, percent);
      return { sessionContexts: next };
    }),

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

  expireWaiting: (agentName) =>
    set((s) => {
      // Only act if the agent is still Waiting — a `spawn_usage`/`session_activity`
      // (→ Active) or `spawn_exit` (→ Idle) may have already resolved it and reset
      // its presence; in that case the watchdog is a no-op.
      const nextWaiting = new Set(s.waitingAgents);
      nextWaiting.delete(agentName);
      let nextPresence = s.presence;
      for (const [sessionId, inner] of s.presence) {
        if (inner.get(agentName) === AgentPresenceStatus.Waiting) {
          nextPresence = setPresence(
            nextPresence,
            sessionId,
            agentName,
            AgentPresenceStatus.Idle,
          );
        }
      }
      if (nextPresence === s.presence && nextWaiting.size === s.waitingAgents.size) {
        return {};
      }
      return { waitingAgents: nextWaiting, presence: nextPresence };
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
      // Any real activity supersedes a pending "waiting" — cancel its watchdog.
      clearWaitingWatchdog(agentName);
      const nextActive = new Set(s.activeAgents).add(agentName);

      // Accumulate tokens/cost for the live tooltip ONLY. The context PERCENT is
      // NOT derived here — it comes from the backend per claudeSessionId via the
      // `session_context` event (the single source of truth).
      let nextContexts = s.agentContexts;
      if (tokensIn > 0 || tokensOut > 0) {
        nextContexts = new Map(s.agentContexts);
        const existing =
          nextContexts.get(agentName) || { tokensIn: 0, tokensOut: 0, costUsd: 0 };
        nextContexts.set(agentName, {
          tokensIn: existing.tokensIn + tokensIn,
          tokensOut: existing.tokensOut + tokensOut,
          costUsd: existing.costUsd + costUsd,
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

    if (data.type === "session_context") {
      const { claudeSessionId, percent } = data;
      set((s) => {
        if (s.sessionContexts.get(claudeSessionId) === percent) return {};
        const next = new Map(s.sessionContexts);
        next.set(claudeSessionId, percent);
        return { sessionContexts: next };
      });
      return;
    }
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
        // Track the latest seq for this (session, agent) so a dismissed tab can
        // reappear once a strictly-newer event arrives.
        presenceSeq: sessionId
          ? setPresenceSeq(s.presenceSeq, sessionId, data.agent_name, data.id)
          : s.presenceSeq,
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
      armWaitingWatchdog(name);
      set((s) => ({
        waitingAgents: new Set(s.waitingAgents).add(name),
        presence: setPresenceByName(s.presence, name, AgentPresenceStatus.Waiting),
      }));
      return;
    }
    if (data.type === "spawn_exit" && data.agentName) {
      const name = data.agentName;
      const exitedSession = data.claudeSessionId;
      clearWaitingWatchdog(name);
      set((s) => {
        const next = new Set(s.waitingAgents);
        next.delete(name);
        // Scope Idle to the session that actually exited (the exit payload carries
        // claudeSessionId). Only fall back to the name-only sweep when it is
        // absent — otherwise a same-named sub-agent still running in another
        // conversation would wrongly flip to Idle here.
        const presence = exitedSession
          ? setPresence(s.presence, exitedSession, name, AgentPresenceStatus.Idle)
          : setPresenceByName(s.presence, name, AgentPresenceStatus.Idle);
        return { waitingAgents: next, presence };
      });
    }
  },
}));

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const waitingTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Arm the waiting watchdog for an agent, replacing any pending one (so a repeated
// input request resets the window rather than firing on the first request's clock).
function armWaitingWatchdog(agentName: string) {
  const existing = waitingTimers.get(agentName);
  if (existing) clearTimeout(existing);
  waitingTimers.set(
    agentName,
    setTimeout(() => {
      waitingTimers.delete(agentName);
      useEventsStore.getState().expireWaiting(agentName);
    }, WAITING_TIMEOUT_MS),
  );
}

// Cancel a pending waiting watchdog (the agent left `Waiting` by another signal).
function clearWaitingWatchdog(agentName: string) {
  const existing = waitingTimers.get(agentName);
  if (existing) {
    clearTimeout(existing);
    waitingTimers.delete(agentName);
  }
}

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
      for (const timer of waitingTimers.values()) clearTimeout(timer);
      waitingTimers.clear();
      useEventsStore.getState().setConnected(false);
    };
  }, []);
}
