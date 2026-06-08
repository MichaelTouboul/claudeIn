import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useDashboardStore } from "@/store/useDashboardStore";
import { useEventsStore } from "@/store/useEventsStore";
import { agentTabId, PanelTabKind, usePanelStore } from "@/store/usePanelStore";
import type { LiveEvent } from "@/types/events.types";

import { AgentTabs } from "./AgentTabs";

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

beforeEach(() => {
  useEventsStore.setState({
    events: [],
    activeAgents: new Set(),
    waitingAgents: new Set(),
    agentContexts: new Map(),
    currentTools: new Map(),
    presence: new Map(),
  });
  useDashboardStore.setState({ agents: [] });
  usePanelStore.setState({ isOpen: false, tabs: [], activeTabId: null, width: 480 });
});

describe("AgentTabs", () => {
  it("renders nothing when no sub-agents are present", () => {
    const { container } = render(
      <AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a tab per sub-agent in the conversation", () => {
    ingestEvent({ id: 2, agent_name: "researcher", session_id: "sess-1" });
    ingestEvent({ id: 1, agent_name: "writer", session_id: "sess-1" });

    render(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);

    expect(screen.getByText("researcher")).toBeInTheDocument();
    expect(screen.getByText("writer")).toBeInTheDocument();
  });

  it("pulses the dot only for an active agent", () => {
    ingestEvent({ id: 2, agent_name: "live", session_id: "sess-1" });
    ingestEvent({ id: 1, agent_name: "resting", session_id: "sess-1" });
    // `resting`'s active window expires; `live` stays active.
    useEventsStore.getState().expireActive("resting");

    render(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);

    const liveDot = screen.getByTestId("agent-tab-dot-live");
    const restingDot = screen.getByTestId("agent-tab-dot-resting");
    expect(liveDot.className).toContain("animate-pulse");
    expect(restingDot.className).not.toContain("animate-pulse");
  });

  it("opens an agent tab in the right panel when a presence tab is clicked", () => {
    ingestEvent({ id: 1, agent_name: "researcher", session_id: "sess-1" });

    render(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);
    fireEvent.click(screen.getByText("researcher"));

    const s = usePanelStore.getState();
    const expectedId = agentTabId("researcher", "sess-1");
    expect(s.isOpen).toBe(true);
    expect(s.activeTabId).toBe(expectedId);
    const tab = s.tabs.find((t) => t.id === expectedId);
    expect(tab?.kind).toBe(PanelTabKind.Agent);
    expect(tab?.title).toBe("researcher");
    if (tab?.kind !== PanelTabKind.Agent) throw new Error("not an agent tab");
    expect(tab.payload).toEqual({ agentName: "researcher", claudeSessionId: "sess-1" });
  });

  it("refocuses the existing agent tab on a second click (no duplicate)", () => {
    ingestEvent({ id: 1, agent_name: "researcher", session_id: "sess-1" });

    render(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);
    fireEvent.click(screen.getByText("researcher"));
    fireEvent.click(screen.getByText("researcher"));

    const s = usePanelStore.getState();
    expect(s.tabs).toHaveLength(1);
    expect(s.activeTabId).toBe(agentTabId("researcher", "sess-1"));
  });

  it("does not render the orchestrator as a tab", () => {
    ingestEvent({ id: 1, agent_name: "orch", session_id: "sess-1" });

    const { container } = render(
      <AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
