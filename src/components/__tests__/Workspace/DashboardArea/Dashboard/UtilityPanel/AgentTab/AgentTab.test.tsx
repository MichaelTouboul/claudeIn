import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AgentTab } from "@/components/Workspace/DashboardArea/Dashboard/UtilityPanel/AgentTab/AgentTab";
import type { LiveEvent } from "@/lib/types";
import { useEventsStore } from "@/store/dashboard/useEventsStore";
import { type PanelTab, PanelTabKind } from "@/store/dashboard/usePanelStore";

function liveEvent(over: Partial<LiveEvent>): LiveEvent {
  return {
    id: 1,
    agent_name: "research",
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

function ingest(over: Partial<LiveEvent>) {
  useEventsStore.getState().ingest({ type: "event", ...liveEvent(over) });
}

function agentTab(over: Partial<{ agentName: string; claudeSessionId: string | null }> = {}): PanelTab {
  return {
    id: "agent:research:sess-1",
    kind: PanelTabKind.Agent,
    title: "research",
    payload: { agentName: "research", claudeSessionId: "sess-1", ...over },
  };
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
});

describe("AgentTab", () => {
  it("renders nothing for a non-agent tab (defensive)", () => {
    const tab: PanelTab = {
      id: "t",
      kind: PanelTabKind.Text,
      title: "T",
      payload: { text: "x" },
    };
    const { container } = render(<AgentTab tab={tab} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the agent name in the header", () => {
    render(<AgentTab tab={agentTab()} />);
    expect(screen.getByText("research")).toBeInTheDocument();
  });

  it("pulses the status dot while the agent is active", () => {
    ingest({ id: 1, agent_name: "research", session_id: "sess-1" });
    render(<AgentTab tab={agentTab()} />);
    const dot = screen.getByTestId("agent-tab-panel-dot");
    expect(dot.className).toContain("animate-pulse");
  });

  it("does not pulse the dot once the agent is idle", () => {
    ingest({ id: 1, agent_name: "research", session_id: "sess-1" });
    useEventsStore.getState().expireActive("research");
    render(<AgentTab tab={agentTab()} />);
    const dot = screen.getByTestId("agent-tab-panel-dot");
    expect(dot.className).not.toContain("animate-pulse");
  });

  it("shows the agent's current tool in the header", () => {
    ingest({ id: 1, agent_name: "research", session_id: "sess-1", tool_name: "Grep" });
    render(<AgentTab tab={agentTab()} />);
    expect(screen.getByTestId("agent-tab-panel-tool").textContent).toBe("Grep");
  });

  it("scopes the header tool to this session, ignoring a same-named agent elsewhere", () => {
    ingest({ id: 1, agent_name: "research", session_id: "sess-1", tool_name: "Grep" });
    // A later event from the SAME-named agent in another conversation must not
    // leak its tool into this tab's header.
    ingest({ id: 2, agent_name: "research", session_id: "sess-2", tool_name: "Read" });
    render(<AgentTab tab={agentTab()} />);
    expect(screen.getByTestId("agent-tab-panel-tool").textContent).toBe("Grep");
  });

  it("streams only this agent's events scoped to the session", () => {
    ingest({ id: 1, agent_name: "research", session_id: "sess-1", tool_name: "Grep" });
    ingest({ id: 2, agent_name: "writer", session_id: "sess-1", tool_name: "Edit" });
    ingest({ id: 3, agent_name: "research", session_id: "sess-2", tool_name: "Read" });

    render(<AgentTab tab={agentTab()} />);

    // research/sess-1 event shown in the stream; other agent + other session out.
    const stream = screen.getByTestId("agent-tab-panel-stream");
    expect(stream.textContent).toContain("Grep");
    expect(stream.textContent).not.toContain("Edit");
    expect(stream.textContent).not.toContain("Read");
  });

  it("renders the empty-stream placeholder when the agent has no events", () => {
    render(<AgentTab tab={agentTab()} />);
    expect(screen.getByText(/no activity/i)).toBeInTheDocument();
  });
});
