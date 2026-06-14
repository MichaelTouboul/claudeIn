import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import type { LiveEvent } from "@/lib/types";
import { AgentPresenceStatus, useEventsStore } from "@/store/dashboard/useEventsStore";

import { useSessionWorkflow } from "../useSessionWorkflow";

function liveEvent(over: Partial<LiveEvent>): LiveEvent {
  return {
    id: 1,
    agent_name: "agent",
    session_id: "s1",
    event_type: "PreToolUse",
    tool_name: null,
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
    created_at: "2026-06-09T10:00:00.000Z",
    ...over,
  };
}

/** Push a sub-agent `event` through the REAL ingest reducer (records presence). */
function ingestEvent(over: Partial<LiveEvent>) {
  useEventsStore.getState().ingest({ type: "event", ...liveEvent(over) });
}

function resetStore() {
  useEventsStore.setState({
    events: [],
    activeAgents: new Set(),
    waitingAgents: new Set(),
    agentContexts: new Map(),
    currentTools: new Map(),
    presence: new Map(),
    presenceSeq: new Map(),
  });
}

describe("useSessionWorkflow", () => {
  beforeEach(() => resetStore());

  it("returns only the requested session's agents (no leak across sessions)", () => {
    act(() => {
      ingestEvent({ id: 1, agent_name: "researcher", session_id: "s1" });
      ingestEvent({ id: 2, agent_name: "writer", session_id: "s1" });
      ingestEvent({ id: 3, agent_name: "other", session_id: "s2" });
    });

    const { result } = renderHook(() => useSessionWorkflow("s1"));

    expect(result.current.map((a) => a.agentName).sort()).toEqual([
      "researcher",
      "writer",
    ]);
  });

  it("derives status from presence, tool from the latest event, and sums tokens", () => {
    act(() => {
      ingestEvent({
        id: 1,
        agent_name: "coder",
        session_id: "s1",
        tool_name: "Read",
        tokens_in: 10,
        tokens_out: 5,
        cost_usd: 0.01,
        created_at: "2026-06-09T10:00:00.000Z",
      });
      ingestEvent({
        id: 2,
        agent_name: "coder",
        session_id: "s1",
        tool_name: "Edit",
        tokens_in: 20,
        tokens_out: 7,
        cost_usd: 0.02,
        created_at: "2026-06-09T10:00:05.000Z",
      });
    });

    const { result } = renderHook(() => useSessionWorkflow("s1"));
    const coder = result.current.find((a) => a.agentName === "coder");

    expect(coder).toBeDefined();
    // A fresh event keeps the agent Active in presence.
    expect(coder?.status).toBe(AgentPresenceStatus.Active);
    // Latest event (id 2) is the Edit.
    expect(coder?.tool).toBe("Edit");
    expect(coder?.tokensIn).toBe(30);
    expect(coder?.tokensOut).toBe(12);
    expect(coder?.costUsd).toBeCloseTo(0.03);
    // Two distinct tools → two segments.
    expect(coder?.segments.map((s) => s.tool)).toEqual(["Read", "Edit"]);
    expect(coder?.latestSeq).toBe(2);
  });

  it("reflects a waiting agent's status from presence", () => {
    act(() => {
      ingestEvent({ id: 1, agent_name: "asker", session_id: "s1" });
      useEventsStore
        .getState()
        .ingest({ type: "spawn_input_request", agentName: "asker" });
    });

    const { result } = renderHook(() => useSessionWorkflow("s1"));
    const asker = result.current.find((a) => a.agentName === "asker");

    expect(asker?.status).toBe(AgentPresenceStatus.Waiting);
  });

  it("sorts agents by latestSeq descending (most recent first)", () => {
    act(() => {
      ingestEvent({ id: 1, agent_name: "old", session_id: "s1" });
      ingestEvent({ id: 9, agent_name: "new", session_id: "s1" });
      ingestEvent({ id: 5, agent_name: "mid", session_id: "s1" });
    });

    const { result } = renderHook(() => useSessionWorkflow("s1"));

    expect(result.current.map((a) => a.agentName)).toEqual(["new", "mid", "old"]);
  });

  it("re-renders with the new value after a newer event is ingested", () => {
    act(() => {
      ingestEvent({
        id: 1,
        agent_name: "coder",
        session_id: "s1",
        tool_name: "Read",
      });
    });

    const { result } = renderHook(() => useSessionWorkflow("s1"));
    expect(result.current[0].tool).toBe("Read");

    act(() => {
      ingestEvent({
        id: 2,
        agent_name: "coder",
        session_id: "s1",
        tool_name: "Bash",
      });
    });

    expect(result.current[0].tool).toBe("Bash");
    expect(result.current[0].latestSeq).toBe(2);
  });

  it("returns [] for a null session id", () => {
    act(() => {
      ingestEvent({ id: 1, agent_name: "coder", session_id: "s1" });
    });

    const { result } = renderHook(() => useSessionWorkflow(null));

    expect(result.current).toEqual([]);
  });

  it("returns [] when the session has no presence", () => {
    act(() => {
      ingestEvent({ id: 1, agent_name: "coder", session_id: "s1" });
    });

    const { result } = renderHook(() => useSessionWorkflow("s-empty"));

    expect(result.current).toEqual([]);
  });
});
