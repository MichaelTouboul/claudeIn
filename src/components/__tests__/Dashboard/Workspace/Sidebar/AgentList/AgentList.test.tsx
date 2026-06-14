import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentList } from "@/components/Dashboard/Workspace/Sidebar/AgentList/AgentList";
import type { AgentSummary } from "@/lib/types";
import { useEventsStore } from "@/store/dashboard/useEventsStore";
import { useFavoritesStore } from "@/store/dashboard/useFavoritesStore";

// AgentRow reads the project via context; the list itself does not. Stub the
// hook so we can render rows without an enclosing ProjectProvider.
vi.mock("@/contexts/ProjectContext", () => ({
  useProject: () => ({
    projectId: "p1",
    projectName: "p1",
    isUserProject: false,
    refresh: vi.fn(),
  }),
}));

function agentSummary(id: string, subAgents: string[] = []): AgentSummary {
  return {
    id,
    scope: "project",
    filePath: `/a/${id}.md`,
    relativePath: `${id}.md`,
    folder: "",
    frontmatter: { name: id, description: "", color: "cyan" },
    subAgents,
    shadowed: false,
  };
}

function renderList(agents: AgentSummary[]) {
  return render(
    <AgentList
      agents={agents}
      selectedId={null}
      onSelect={vi.fn()}
      onAgentAction={vi.fn()}
    />,
  );
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
  useFavoritesStore.setState({ byProject: {} });
});

describe("AgentList", () => {
  it("renders every agent as a flat row, including orchestrators and their sub-agents", () => {
    const agents = [
      agentSummary("orchestrator", ["researcher"]),
      agentSummary("researcher"),
      agentSummary("standalone"),
    ];
    renderList(agents);

    // No live nested tree: each defined agent shows once, as a browsable row.
    expect(screen.getByText("orchestrator")).toBeInTheDocument();
    expect(screen.getByText("researcher")).toBeInTheDocument();
    expect(screen.getByText("standalone")).toBeInTheDocument();
  });

  it("renders each provided agent exactly once (no nested tree duplication)", () => {
    const agents = [
      agentSummary("orchestrator", ["researcher"]),
      agentSummary("researcher"),
    ];
    renderList(agents);

    expect(screen.getAllByText("researcher")).toHaveLength(1);
    expect(screen.getAllByText("orchestrator")).toHaveLength(1);
  });
});
