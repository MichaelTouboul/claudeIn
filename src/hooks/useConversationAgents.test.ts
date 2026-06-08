import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useDashboardStore } from "@/store/useDashboardStore";
import { useEventsStore } from "@/store/useEventsStore";
import type { AgentSummary } from "@/types/agents-mirror.types";
import type { LiveEvent } from "@/types/events.types";

import {
  CONVERSATION_AGENT_DOT,
  ConversationAgentStatus,
  paletteColor,
  useConversationAgents,
} from "./useConversationAgents";

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
  });
  useDashboardStore.setState({ agents: [] });
}

describe("useConversationAgents", () => {
  beforeEach(() => resetStores());

  it("returns only sub-agents whose events carry this conversation's session_id", () => {
    act(() => {
      useEventsStore.setState({
        events: [
          liveEvent({ id: 3, agent_name: "researcher", session_id: "sess-1" }),
          liveEvent({ id: 2, agent_name: "writer", session_id: "sess-1" }),
          liveEvent({ id: 1, agent_name: "other", session_id: "sess-2" }),
        ],
      });
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
      useEventsStore.setState({
        events: [
          liveEvent({ id: 2, agent_name: "orchestrator", session_id: "sess-1" }),
          liveEvent({ id: 1, agent_name: "researcher", session_id: "sess-1" }),
        ],
      });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orchestrator"),
    );

    expect(result.current.map((a) => a.name)).toEqual(["researcher"]);
  });

  it("derives status from the by-name active/waiting sets", () => {
    act(() => {
      useEventsStore.setState({
        events: [
          liveEvent({ id: 3, agent_name: "active-one", session_id: "sess-1" }),
          liveEvent({ id: 2, agent_name: "waiting-one", session_id: "sess-1" }),
          liveEvent({ id: 1, agent_name: "idle-one", session_id: "sess-1" }),
        ],
        activeAgents: new Set(["active-one"]),
        waitingAgents: new Set(["waiting-one"]),
      });
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

  it("uses the defined project agent's frontmatter color when the name matches", () => {
    act(() => {
      useDashboardStore.setState({
        agents: [agentSummary("researcher", "purple")],
      });
      useEventsStore.setState({
        events: [
          liveEvent({ id: 1, agent_name: "researcher", session_id: "sess-1" }),
        ],
      });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orchestrator"),
    );

    expect(result.current[0].color).toBe("purple");
  });

  it("falls back to a deterministic palette color for an unknown name", () => {
    act(() => {
      useEventsStore.setState({
        events: [
          liveEvent({ id: 1, agent_name: "mystery", session_id: "sess-1" }),
        ],
      });
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
      useEventsStore.setState({
        events: [liveEvent({ id: 1, agent_name: "x", session_id: "sess-2" })],
      });
    });

    const { result } = renderHook(() =>
      useConversationAgents("sess-1", "orchestrator"),
    );

    expect(result.current).toEqual([]);
  });

  it("returns an empty list when claudeSessionId is null", () => {
    act(() => {
      useEventsStore.setState({
        events: [liveEvent({ id: 1, agent_name: "x", session_id: "sess-1" })],
      });
    });

    const { result } = renderHook(() =>
      useConversationAgents(null, "orchestrator"),
    );

    expect(result.current).toEqual([]);
  });

  it("maps each status to a dot behavior — only active pulses", () => {
    expect(CONVERSATION_AGENT_DOT[ConversationAgentStatus.Active].pulse).toBe(
      true,
    );
    expect(CONVERSATION_AGENT_DOT[ConversationAgentStatus.Waiting].pulse).toBe(
      false,
    );
    expect(CONVERSATION_AGENT_DOT[ConversationAgentStatus.Idle].pulse).toBe(
      false,
    );
  });
});
