import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveEvent } from "@/types/events.types";

import { AgentPresenceStatus, useEventsStore } from "./useEventsStore";

function liveEvent(over: Partial<LiveEvent>): LiveEvent {
  return {
    id: 1,
    agent_name: "agent",
    session_id: "sess-1",
    event_type: "PreToolUse",
    tool_name: null,
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
    created_at: "2026-06-08T00:00:00.000Z",
    ...over,
  };
}

function ingestEvent(over: Partial<LiveEvent>) {
  useEventsStore.getState().ingest({ type: "event", ...liveEvent(over) });
}

function presenceOf(sessionId: string, agentName: string) {
  return useEventsStore.getState().presence.get(sessionId)?.get(agentName);
}

beforeEach(() => {
  vi.useFakeTimers();
  useEventsStore.setState({
    events: [],
    activeAgents: new Set(),
    waitingAgents: new Set(),
    agentContexts: new Map(),
    currentTools: new Map(),
    presence: new Map(),
  });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("useEventsStore presence expiry", () => {
  it("demotes Active → Idle after the active window elapses", () => {
    ingestEvent({ id: 1, agent_name: "runner", session_id: "sess-1" });
    expect(presenceOf("sess-1", "runner")).toBe(AgentPresenceStatus.Active);

    vi.advanceTimersByTime(6000);

    expect(presenceOf("sess-1", "runner")).toBe(AgentPresenceStatus.Idle);
  });

  it("demotes a stuck Waiting agent to Idle after the waiting watchdog elapses", () => {
    // Sub-agent is seen, then asks for input, then its process dies WITHOUT a
    // spawn_exit. Nothing else can clear Waiting — the watchdog must.
    ingestEvent({ id: 1, agent_name: "stuck", session_id: "sess-1" });
    useEventsStore
      .getState()
      .ingest({ type: "spawn_input_request", agentName: "stuck" });
    expect(presenceOf("sess-1", "stuck")).toBe(AgentPresenceStatus.Waiting);

    // Active window passes — Waiting must NOT survive indefinitely.
    vi.advanceTimersByTime(60_000);

    expect(presenceOf("sess-1", "stuck")).toBe(AgentPresenceStatus.Idle);
    expect(useEventsStore.getState().waitingAgents.has("stuck")).toBe(false);
  });

  it("keeps Waiting alive while fresh waiting requests keep arriving", () => {
    ingestEvent({ id: 1, agent_name: "asker", session_id: "sess-1" });
    useEventsStore
      .getState()
      .ingest({ type: "spawn_input_request", agentName: "asker" });

    // Re-request before the watchdog fires — the timer should reset.
    vi.advanceTimersByTime(20_000);
    useEventsStore
      .getState()
      .ingest({ type: "spawn_input_request", agentName: "asker" });
    vi.advanceTimersByTime(20_000);

    expect(presenceOf("sess-1", "asker")).toBe(AgentPresenceStatus.Waiting);
  });

  it("does not demote Waiting that was already resolved by spawn_exit", () => {
    ingestEvent({ id: 1, agent_name: "done", session_id: "sess-1" });
    useEventsStore
      .getState()
      .ingest({ type: "spawn_input_request", agentName: "done" });
    useEventsStore
      .getState()
      .ingest({ type: "spawn_exit", agentName: "done" });
    expect(presenceOf("sess-1", "done")).toBe(AgentPresenceStatus.Idle);

    vi.advanceTimersByTime(60_000);
    // Still idle — the watchdog must not resurrect or re-demote anything.
    expect(presenceOf("sess-1", "done")).toBe(AgentPresenceStatus.Idle);
  });
});
