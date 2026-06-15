import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentsPane } from "@/components/Customize/CustomizeContent/AgentsPane";
import type { AgentsSnapshot, AgentSummary } from "@/lib/types";

const getAgentsMirror = vi.fn<(p?: string) => Promise<AgentsSnapshot>>();
const onAgentsChanged = vi.fn(() => () => {});
const getAgentByPath = vi.fn();

function agent(id: string, description: string): AgentSummary {
  return {
    id,
    scope: "project",
    filePath: `/agents/${id}.md`,
    relativePath: `${id}.md`,
    folder: "",
    frontmatter: { name: id, description },
    subAgents: [],
    shadowed: false,
  };
}

beforeEach(() => {
  getAgentsMirror.mockReset();
  onAgentsChanged.mockReset().mockReturnValue(() => {});
  getAgentByPath.mockReset().mockResolvedValue({ body: "# Reviewer body" });
  window.api = { getAgentsMirror, onAgentsChanged, getAgentByPath } as unknown as Window["api"];
});

describe("AgentsPane", () => {
  it("lists each sub-agent from the mirror with name and description", async () => {
    getAgentsMirror.mockResolvedValue({
      projectPath: null,
      agents: [agent("reviewer", "Reviews diffs"), agent("tester", "Writes tests")],
    });
    render(<AgentsPane repoScope={null} />);

    expect(await screen.findByText("reviewer")).toBeInTheDocument();
    expect(screen.getByText("Reviews diffs")).toBeInTheDocument();
    expect(screen.getByText("tester")).toBeInTheDocument();
  });

  it("shows loading then empty states", async () => {
    getAgentsMirror.mockResolvedValue({ projectPath: null, agents: [] });
    render(<AgentsPane repoScope={null} />);
    await waitFor(() =>
      expect(screen.getByText(/no sub-agents in this scope/i)).toBeInTheDocument(),
    );
  });

  it("opens a read drawer with the agent body when a row is clicked", async () => {
    getAgentsMirror.mockResolvedValue({
      projectPath: null,
      agents: [agent("reviewer", "Reviews diffs")],
    });
    render(<AgentsPane repoScope={null} />);

    fireEvent.click(await screen.findByRole("button", { name: /reviewer/i }));
    await waitFor(() => expect(getAgentByPath).toHaveBeenCalledWith("/agents/reviewer.md"));
    expect(await screen.findByText(/Reviewer body/i)).toBeInTheDocument();
  });
});
