import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AgentTabs } from "@/components/AgentChat/AgentChatInput/AgentTabs/AgentTabs";
import type { LiveEvent } from "@/lib/types";
import { useAgentDismissStore } from "@/store/dashboard/useAgentDismissStore";
import { useDashboardStore } from "@/store/dashboard/useDashboardStore";
import { useEventsStore } from "@/store/dashboard/useEventsStore";
import { agentTabId, PanelTabKind, usePanelStore, workflowTabId } from "@/store/dashboard/usePanelStore";

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
    presenceSeq: new Map(),
  });
  useDashboardStore.setState({ agents: [] });
  useAgentDismissStore.setState({ dismissed: new Map() });
  usePanelStore.setState({ isOpen: false, current: null, width: 480 });
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

  it("opens an agent object in the right panel when a presence tab is clicked", () => {
    ingestEvent({ id: 1, agent_name: "researcher", session_id: "sess-1" });

    render(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);
    fireEvent.click(screen.getByText("researcher"));

    const s = usePanelStore.getState();
    const expectedId = agentTabId("researcher", "sess-1");
    expect(s.isOpen).toBe(true);
    const obj = s.current;
    expect(obj?.id).toBe(expectedId);
    expect(obj?.kind).toBe(PanelTabKind.Agent);
    expect(obj?.title).toBe("researcher");
    if (obj?.kind !== PanelTabKind.Agent) throw new Error("not an agent object");
    expect(obj.payload).toEqual({ agentName: "researcher", claudeSessionId: "sess-1" });
  });

  it("re-shows the same agent object on a second click (single-object)", () => {
    ingestEvent({ id: 1, agent_name: "researcher", session_id: "sess-1" });

    render(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);
    fireEvent.click(screen.getByText("researcher"));
    fireEvent.click(screen.getByText("researcher"));

    const s = usePanelStore.getState();
    expect(s.current?.id).toBe(agentTabId("researcher", "sess-1"));
  });

  it("hides a tab after its × is clicked, without opening the panel", () => {
    ingestEvent({ id: 5, agent_name: "researcher", session_id: "sess-1" });

    const { rerender } = render(
      <AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />,
    );
    fireEvent.click(screen.getByTestId("agent-tab-dismiss-researcher"));

    // Dismiss must not open the right panel (it is not a tab click).
    expect(usePanelStore.getState().isOpen).toBe(false);
    rerender(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);
    expect(screen.queryByText("researcher")).not.toBeInTheDocument();
  });

  it("reappears after dismissal once a newer event arrives", () => {
    ingestEvent({ id: 5, agent_name: "researcher", session_id: "sess-1" });

    const { rerender } = render(
      <AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />,
    );
    fireEvent.click(screen.getByTestId("agent-tab-dismiss-researcher"));
    rerender(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);
    expect(screen.queryByText("researcher")).not.toBeInTheDocument();

    // A strictly-newer event re-shows the tab.
    ingestEvent({ id: 6, agent_name: "researcher", session_id: "sess-1" });
    rerender(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);
    expect(screen.getByText("researcher")).toBeInTheDocument();
  });

  it("opens a Workflow object for the session when the overview control is clicked", () => {
    ingestEvent({ id: 1, agent_name: "researcher", session_id: "sess-1" });

    render(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);
    fireEvent.click(screen.getByRole("button", { name: "Open session overview" }));

    const s = usePanelStore.getState();
    const expectedId = workflowTabId("sess-1");
    expect(s.isOpen).toBe(true);
    const obj = s.current;
    expect(obj?.id).toBe(expectedId);
    expect(obj?.kind).toBe(PanelTabKind.Workflow);
    if (obj?.kind !== PanelTabKind.Workflow) throw new Error("not a workflow object");
    expect(obj.payload).toEqual({ claudeSessionId: "sess-1" });
  });

  it("re-shows the same Workflow object on a second overview click", () => {
    ingestEvent({ id: 1, agent_name: "researcher", session_id: "sess-1" });

    render(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);
    fireEvent.click(screen.getByRole("button", { name: "Open session overview" }));
    fireEvent.click(screen.getByRole("button", { name: "Open session overview" }));

    const s = usePanelStore.getState();
    expect(s.current?.kind).toBe(PanelTabKind.Workflow);
    expect(s.current?.id).toBe(workflowTabId("sess-1"));
  });

  it("does not render the orchestrator as a tab", () => {
    ingestEvent({ id: 1, agent_name: "orch", session_id: "sess-1" });

    const { container } = render(
      <AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
