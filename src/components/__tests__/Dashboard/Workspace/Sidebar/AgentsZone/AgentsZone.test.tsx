import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentsZone } from "@/components/Dashboard/Workspace/Sidebar/AgentsZone/AgentsZone";
import { AgentScope, type AgentSummary } from "@/lib/types";
import { useEventsStore } from "@/store/dashboard/useEventsStore";
import { useFavoritesStore } from "@/store/dashboard/useFavoritesStore";

vi.mock("@/contexts/ProjectContext", () => ({
  useProject: () => ({ projectId: "p1", projectName: "p1", isUserProject: false, refresh: vi.fn() }),
}));

function agent(id: string, scope: AgentScope, description = "", source: string | null = null): AgentSummary {
  return {
    id,
    scope,
    filePath: `/a/${id}.md`,
    relativePath: `${id}.md`,
    folder: "",
    frontmatter: { name: id, description, color: "cyan" },
    subAgents: [],
    shadowed: false,
    source,
  };
}

const AGENTS: AgentSummary[] = [
  agent("project-guardian", AgentScope.Project, "Keeps CLAUDE.md accurate"),
  agent("user-reviewer", AgentScope.User, "Reviews diffs"),
  agent("user-planner", AgentScope.User, "Breaks tickets into steps"),
  agent("plugin-cr", AgentScope.Plugin, "Reviews PRs", "quality-pack"),
];

/** A harness that owns scope state so tab clicks actually switch the list. */
function Harness({ initial = AgentScope.Project, agents = AGENTS }: { initial?: AgentScope; agents?: AgentSummary[] }) {
  const [scope, setScope] = useState<AgentScope>(initial);
  return (
    <AgentsZone
      agents={agents}
      scope={scope}
      onScopeChange={setScope}
      selectedId={null}
      onSelect={vi.fn()}
      onAgentAction={vi.fn()}
      onNewAgent={vi.fn()}
    />
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

describe("AgentsZone", () => {
  it("shows Project / User / Plugin tabs with per-scope counts", () => {
    render(<Harness />);
    const tablist = screen.getByRole("tablist");
    expect(within(tablist).getByText("Project")).toBeInTheDocument();
    expect(within(tablist).getByText("User")).toBeInTheDocument();
    expect(within(tablist).getByText("Plugin")).toBeInTheDocument();
    // counts: 1 project, 2 user, 1 plugin → two tabs show "1", one shows "2"
    expect(within(tablist).getAllByText("1")).toHaveLength(2);
    expect(within(tablist).getByText("2")).toBeInTheDocument();
  });

  it("switching tabs swaps the visible list", () => {
    render(<Harness />);
    // Project tab active by default.
    expect(screen.getByText("project-guardian")).toBeInTheDocument();
    expect(screen.queryByText("user-reviewer")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("User"));
    expect(screen.getByText("user-reviewer")).toBeInTheDocument();
    expect(screen.getByText("user-planner")).toBeInTheDocument();
    expect(screen.queryByText("project-guardian")).not.toBeInTheDocument();
  });

  it("filters the visible list by name and description", () => {
    render(<Harness initial={AgentScope.User} />);
    const filter = screen.getByLabelText("Filter agents");

    fireEvent.change(filter, { target: { value: "tickets" } }); // matches description
    expect(screen.getByText("user-planner")).toBeInTheDocument();
    expect(screen.queryByText("user-reviewer")).not.toBeInTheDocument();

    fireEvent.change(filter, { target: { value: "reviewer" } }); // matches name
    expect(screen.getByText("user-reviewer")).toBeInTheDocument();
    expect(screen.queryByText("user-planner")).not.toBeInTheDocument();
  });

  it("clears the filter when switching tabs", () => {
    render(<Harness initial={AgentScope.User} />);
    const filter = screen.getByLabelText("Filter agents") as HTMLInputElement;
    fireEvent.change(filter, { target: { value: "reviewer" } });
    expect(filter.value).toBe("reviewer");

    fireEvent.click(screen.getByText("Plugin"));
    expect((screen.getByLabelText("Filter agents") as HTMLInputElement).value).toBe("");
    expect(screen.getByText("plugin-cr")).toBeInTheDocument();
  });

  it("renders a Plugin empty state (not removing the tab) when no plugin agents exist", () => {
    const noPlugins = AGENTS.filter((a) => a.scope !== AgentScope.Plugin);
    render(<Harness initial={AgentScope.Plugin} agents={noPlugins} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByText("Plugin")).toBeInTheDocument();
    expect(screen.getByText("No plugin agents")).toBeInTheDocument();
  });

  it("wires the New agent footer affordance", () => {
    const onNewAgent = vi.fn();
    render(
      <AgentsZone
        agents={AGENTS}
        scope={AgentScope.Project}
        onScopeChange={vi.fn()}
        selectedId={null}
        onSelect={vi.fn()}
        onAgentAction={vi.fn()}
        onNewAgent={onNewAgent}
      />,
    );
    fireEvent.click(screen.getByText("New agent"));
    expect(onNewAgent).toHaveBeenCalledOnce();
  });
});
