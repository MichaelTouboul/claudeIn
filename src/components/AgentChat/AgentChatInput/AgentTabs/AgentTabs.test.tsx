import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useDashboardStore } from "@/store/useDashboardStore";
import { useEventsStore } from "@/store/useEventsStore";
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

beforeEach(() => {
  useEventsStore.setState({
    events: [],
    activeAgents: new Set(),
    waitingAgents: new Set(),
    agentContexts: new Map(),
    currentTools: new Map(),
  });
  useDashboardStore.setState({ agents: [] });
});

describe("AgentTabs", () => {
  it("renders nothing when no sub-agents are present", () => {
    const { container } = render(
      <AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a tab per sub-agent in the conversation", () => {
    useEventsStore.setState({
      events: [
        liveEvent({ id: 2, agent_name: "researcher", session_id: "sess-1" }),
        liveEvent({ id: 1, agent_name: "writer", session_id: "sess-1" }),
      ],
    });

    render(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);

    expect(screen.getByText("researcher")).toBeInTheDocument();
    expect(screen.getByText("writer")).toBeInTheDocument();
  });

  it("pulses the dot only for an active agent", () => {
    useEventsStore.setState({
      events: [
        liveEvent({ id: 2, agent_name: "live", session_id: "sess-1" }),
        liveEvent({ id: 1, agent_name: "resting", session_id: "sess-1" }),
      ],
      activeAgents: new Set(["live"]),
    });

    render(<AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />);

    const liveDot = screen.getByTestId("agent-tab-dot-live");
    const restingDot = screen.getByTestId("agent-tab-dot-resting");
    expect(liveDot.className).toContain("animate-pulse");
    expect(restingDot.className).not.toContain("animate-pulse");
  });

  it("does not render the orchestrator as a tab", () => {
    useEventsStore.setState({
      events: [liveEvent({ id: 1, agent_name: "orch", session_id: "sess-1" })],
    });

    const { container } = render(
      <AgentTabs claudeSessionId="sess-1" orchestratorName="orch" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
