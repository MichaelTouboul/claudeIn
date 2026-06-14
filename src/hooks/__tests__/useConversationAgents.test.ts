import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import type { AgentSummary, LiveEvent  } from "@/lib/types";
import { useAgentDismissStore } from "@/store/useAgentDismissStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { AgentPresenceStatus, useEventsStore } from "@/store/useEventsStore";

import {
  CONVERSATION_AGENT_DOT,
  ConversationAgentStatus,
  paletteColor,
  useConversationAgents,
} from "../useConversationAgents";

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

/** Push a sub-agent `event` through the real ingest path (records presence). */
function ingestEvent(over: Partial<LiveEvent>) {
  useEventsStore.getState().ingest({ type: "event", ...liveEvent(over) });
}

function agentSummary(id: string, color: string): AgentSummary {
  return {
    id,
    scope: "project",
    filePath: `/a/${id}.md`,
    relativePath: `${id}.md`,
    folder: "",
    frontmatter: { name: id, description: "", color },
    subAgents: [],
    shadowed: false,
  };
}

function resetStores() {
  useEventsStore.setState({
    events: [],
    activeAgents: new Set(),
    waitingAgents: new Set(),
    agentContexts: new Map(),
    currentTools: new Map(),
    presence: new Map(),
    presenceSeq: new Map(),
  });
  useDashboardStore.setState({ agents: [] });
  useAgentDismissStore.setState({ dismissed: new Map() });
}

describe("useConversationAgents", () => {
  beforeEach(() => resetStores());

  it("returns only sub-agents whose events carry this conversation's session_id", () => {
    act(() => {
      ingestEvent({ id: 3, agent_name: "researcher", session_id: "sess-1" });
      ingestEvent({ id: 2, agent_name: "writer", session_id: "sess-1" });
      ingestEvent({ id: 1, agent_name: "other", session_id: "sess-2" });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orchestrator"),
    );

    expect(result.current.map((a) => a.name).sort()).toEqual([
      "researcher",
      "writer",
    ]);
  });

  it("excludes the orchestrator/main agent (the conversation itself)", () => {
    act(() => {
      ingestEvent({ id: 2, agent_name: "orchestrator", session_id: "sess-1" });
      ingestEvent({ id: 1, agent_name: "researcher", session_id: "sess-1" });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orchestrator"),
    );

    expect(result.current.map((a) => a.name)).toEqual(["researcher"]);
  });

  it("derives status from session-scoped presence (active / waiting / idle)", () => {
    act(() => {
      // active-one: a fresh event keeps it Active.
      ingestEvent({ id: 3, agent_name: "active-one", session_id: "sess-1" });
      // waiting-one: an event then a waiting request scoped to its name.
      ingestEvent({ id: 2, agent_name: "waiting-one", session_id: "sess-1" });
      useEventsStore
        .getState()
        .ingest({ type: "spawn_input_request", agentName: "waiting-one" });
      // idle-one: seen, then its active window expires.
      ingestEvent({ id: 1, agent_name: "idle-one", session_id: "sess-1" });
      useEventsStore.getState().expireActive("idle-one");
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orchestrator"),
    );

    const byName = Object.fromEntries(
      result.current.map((a) => [a.name, a.status]),
    );
    expect(byName["active-one"]).toBe(ConversationAgentStatus.Active);
    expect(byName["waiting-one"]).toBe(ConversationAgentStatus.Waiting);
    expect(byName["idle-one"]).toBe(ConversationAgentStatus.Idle);
  });

  it("does NOT leak status across sessions sharing an agent name", () => {
    act(() => {
      // Same agent name in two conversations.
      ingestEvent({ id: 2, agent_name: "researcher", session_id: "sess-A" });
      ingestEvent({ id: 1, agent_name: "researcher", session_id: "sess-B" });
      // Only conversation A's researcher goes idle; B stays active.
      // (expireActive is name-keyed, so simulate B being re-activated after.)
      useEventsStore.getState().expireActive("researcher");
      ingestEvent({ id: 3, agent_name: "researcher", session_id: "sess-B" });
    });

    const { result: a } = renderHook(() =>
      useConversationAgents("sess-A", "orch"),
    );
    const { result: b } = renderHook(() =>
      useConversationAgents("sess-B", "orch"),
    );

    expect(a.current[0].status).toBe(ConversationAgentStatus.Idle);
    expect(b.current[0].status).toBe(ConversationAgentStatus.Active);
  });

  it("keeps a sub-agent's tab after its events evict from the 200-buffer", () => {
    act(() => {
      ingestEvent({ id: 0, agent_name: "early", session_id: "sess-1" });
      // Flood with 250 unrelated events to push `early`'s event off the buffer.
      for (let i = 1; i <= 250; i += 1) {
        ingestEvent({ id: i, agent_name: "noise", session_id: "sess-2" });
      }
    });

    // The rolling buffer no longer holds `early`'s event...
    expect(
      useEventsStore.getState().events.some((e) => e.agent_name === "early"),
    ).toBe(false);

    // ...but its presence tab survives.
    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orch"),
    );
    expect(result.current.map((a) => a.name)).toContain("early");
  });

  it("uses the defined project agent's frontmatter color when the name matches", () => {
    act(() => {
      useDashboardStore.setState({
        agents: [agentSummary("researcher", "purple")],
      });
      ingestEvent({ id: 1, agent_name: "researcher", session_id: "sess-1" });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orchestrator"),
    );

    expect(result.current[0].color).toBe("purple");
  });

  it("matches the defined agent's color despite case/whitespace differences in the runtime name", () => {
    act(() => {
      // Defined agent name is "Researcher"; the backend reports "researcher "
      // (different casing + trailing space). The configured color must still win
      // rather than silently falling back to the palette hash.
      useDashboardStore.setState({
        agents: [agentSummary("Researcher", "purple")],
      });
      ingestEvent({ id: 1, agent_name: "researcher ", session_id: "sess-1" });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orchestrator"),
    );

    expect(result.current[0].color).toBe("purple");
  });

  it("falls back to a deterministic palette color for an unknown name", () => {
    act(() => {
      ingestEvent({ id: 1, agent_name: "mystery", session_id: "sess-1" });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orchestrator"),
    );

    expect(result.current[0].color).toBe(paletteColor("mystery"));
    // deterministic
    expect(paletteColor("mystery")).toBe(paletteColor("mystery"));
  });

  it("returns an empty list when no events carry this session_id", () => {
    act(() => {
      ingestEvent({ id: 1, agent_name: "x", session_id: "sess-2" });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orchestrator"),
    );

    expect(result.current).toEqual([]);
  });

  it("returns an empty list when claudeSessionId is null", () => {
    act(() => {
      ingestEvent({ id: 1, agent_name: "x", session_id: "sess-1" });
    });

    const { result } = renderHook(() =>
      useConversationAgents(null, "orchestrator"),
    );

    expect(result.current).toEqual([]);
  });

  it("hides a dismissed agent while no newer event has arrived", () => {
    act(() => {
      ingestEvent({ id: 5, agent_name: "researcher", session_id: "sess-1" });
    });

    const { result, rerender } = renderHook(() =>
      useConversationAgents("sess-1", "orch"),
    );
    expect(result.current.map((a) => a.name)).toEqual(["researcher"]);

    // Dismiss at the agent's current latest seq.
    act(() => {
      useAgentDismissStore.getState().dismiss("sess-1", "researcher", 5);
    });
    rerender();
    expect(result.current).toEqual([]);
  });

  it("reappears once the agent emits a STRICTLY-NEWER event after dismissal", () => {
    act(() => {
      ingestEvent({ id: 5, agent_name: "researcher", session_id: "sess-1" });
      useAgentDismissStore.getState().dismiss("sess-1", "researcher", 5);
    });

    const { result, rerender } = renderHook(() =>
      useConversationAgents("sess-1", "orch"),
    );
    expect(result.current).toEqual([]);

    // A newer event (id > dismissed seq) brings the tab back.
    act(() => {
      ingestEvent({ id: 6, agent_name: "researcher", session_id: "sess-1" });
    });
    rerender();
    expect(result.current.map((a) => a.name)).toEqual(["researcher"]);
  });

  it("stays hidden when a same-seq (not newer) event re-ingests after dismissal", () => {
    act(() => {
      ingestEvent({ id: 7, agent_name: "researcher", session_id: "sess-1" });
      useAgentDismissStore.getState().dismiss("sess-1", "researcher", 7);
      // An out-of-order/duplicate event with id <= dismissed seq must NOT re-show.
      ingestEvent({ id: 7, agent_name: "researcher", session_id: "sess-1" });
      ingestEvent({ id: 3, agent_name: "researcher", session_id: "sess-1" });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orch"),
    );
    expect(result.current).toEqual([]);
  });

  it("does not leak a dismissal across sessions sharing an agent name", () => {
    act(() => {
      ingestEvent({ id: 2, agent_name: "researcher", session_id: "sess-A" });
      ingestEvent({ id: 1, agent_name: "researcher", session_id: "sess-B" });
      // Dismiss only in conversation A.
      useAgentDismissStore.getState().dismiss("sess-A", "researcher", 2);
    });

    const { result: a } = renderHook(() =>
      useConversationAgents("sess-A", "orch"),
    );
    const { result: b } = renderHook(() =>
      useConversationAgents("sess-B", "orch"),
    );
    expect(a.current).toEqual([]);
    expect(b.current.map((x) => x.name)).toEqual(["researcher"]);
  });

  it("exposes the latest seen seq per agent", () => {
    act(() => {
      ingestEvent({ id: 4, agent_name: "researcher", session_id: "sess-1" });
      ingestEvent({ id: 9, agent_name: "researcher", session_id: "sess-1" });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orch"),
    );
    expect(result.current[0].latestSeq).toBe(9);
  });

  it("maps each status to a dot behavior — only active pulses", () => {
    expect(CONVERSATION_AGENT_DOT[AgentPresenceStatus.Active].pulse).toBe(true);
    expect(CONVERSATION_AGENT_DOT[AgentPresenceStatus.Waiting].pulse).toBe(false);
    expect(CONVERSATION_AGENT_DOT[AgentPresenceStatus.Idle].pulse).toBe(false);
  });
});
