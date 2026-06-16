import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentRow } from "@/components/Dashboard/Workspace/Sidebar/AgentRow/AgentRow";
import { AgentScope, type AgentSummary } from "@/lib/types";
import { useEventsStore } from "@/store/dashboard/useEventsStore";
import { useFavoritesStore } from "@/store/dashboard/useFavoritesStore";

vi.mock("@/contexts/ProjectContext", () => ({
  useProject: () => ({ projectId: "p1", projectName: "p1", isUserProject: false, refresh: vi.fn() }),
}));

function agent(over: Partial<AgentSummary> = {}): AgentSummary {
  return {
    id: "reviewer",
    scope: AgentScope.User,
    filePath: "/a/reviewer.md",
    relativePath: "reviewer.md",
    folder: "",
    frontmatter: { name: "reviewer", description: "Reviews diffs for bugs", color: "green" },
    subAgents: [],
    shadowed: false,
    source: null,
    ...over,
  };
}

function setActive(ids: string[]) {
  useEventsStore.setState({
    events: [],
    activeAgents: new Set(ids),
    waitingAgents: new Set(),
    agentContexts: new Map(),
    currentTools: new Map(),
    presence: new Map(),
    presenceSeq: new Map(),
  });
}

beforeEach(() => {
  setActive([]);
  useFavoritesStore.setState({ byProject: {} });
});

describe("AgentRow (redesigned)", () => {
  it("renders the name and a truncated description line", () => {
    render(<AgentRow agent={agent()} selected={false} onSelect={vi.fn()} onAgentAction={vi.fn()} />);
    expect(screen.getByText("reviewer")).toBeInTheDocument();
    expect(screen.getByText("Reviews diffs for bugs")).toBeInTheDocument();
  });

  it("shows the running indicator + 'running' label when the agent is live", () => {
    setActive(["reviewer"]);
    render(<AgentRow agent={agent()} selected={false} onSelect={vi.fn()} onAgentAction={vi.fn()} />);
    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByLabelText("running")).toBeInTheDocument();
  });

  it("does not show the running label when idle", () => {
    render(<AgentRow agent={agent()} selected={false} onSelect={vi.fn()} onAgentAction={vi.fn()} />);
    expect(screen.queryByText("running")).not.toBeInTheDocument();
  });

  it("shows the plugin source badge (pack name, -pack stripped) when not hovered", () => {
    render(
      <AgentRow
        agent={agent({ scope: AgentScope.Plugin, source: "quality-pack" })}
        selected={false}
        onSelect={vi.fn()}
        onAgentAction={vi.fn()}
      />,
    );
    expect(screen.getByText("quality")).toBeInTheDocument();
  });

  it("invokes onSelect when the row is clicked", () => {
    const onSelect = vi.fn();
    render(<AgentRow agent={agent()} selected={false} onSelect={onSelect} onAgentAction={vi.fn()} />);
    fireEvent.click(screen.getByText("reviewer"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("renders the context menu trigger (revealed on hover via CSS)", () => {
    render(<AgentRow agent={agent()} selected={false} onSelect={vi.fn()} onAgentAction={vi.fn()} />);
    expect(screen.getByLabelText(/more actions/i)).toBeInTheDocument();
  });
});
