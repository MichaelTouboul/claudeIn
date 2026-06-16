import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentsPane } from "@/components/Customize/CustomizeContent/AgentsPane";
import type { AgentsSnapshot, AgentSummary } from "@/lib/types";

const getAgentsMirror = vi.fn<(p?: string) => Promise<AgentsSnapshot>>();
const onAgentsChanged = vi.fn(() => () => {});
const getAgentByPath = vi.fn();
const updateAgent = vi.fn();

function agent(
  id: string,
  description: string,
  scope: AgentSummary["scope"] = "project",
): AgentSummary {
  return {
    id,
    scope,
    filePath: `/agents/${id}.md`,
    relativePath: `${id}.md`,
    folder: "",
    frontmatter: { name: id, description },
    subAgents: [],
    shadowed: false,
    source: null,
  };
}

beforeEach(() => {
  getAgentsMirror.mockReset();
  onAgentsChanged.mockReset().mockReturnValue(() => {});
  getAgentByPath.mockReset().mockResolvedValue({
    id: "reviewer",
    frontmatter: { name: "reviewer", description: "Reviews diffs" },
    body: "# Reviewer body",
  });
  updateAgent.mockReset();
  window.api = { getAgentsMirror, onAgentsChanged, getAgentByPath, updateAgent } as unknown as Window["api"];
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

  it("keeps project-scope agents read-only (no Edit affordance)", async () => {
    getAgentsMirror.mockResolvedValue({
      projectPath: null,
      agents: [agent("reviewer", "Reviews diffs", "project")],
    });
    render(<AgentsPane repoScope={null} />);

    fireEvent.click(await screen.findByRole("button", { name: /reviewer/i }));
    await screen.findByText(/Reviewer body/i);
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/read-only here/i)).toBeInTheDocument();
  });

  it("edits a user-scope agent and saves via updateAgent", async () => {
    getAgentsMirror.mockResolvedValue({
      projectPath: null,
      agents: [agent("reviewer", "Reviews diffs", "user")],
    });
    updateAgent.mockResolvedValue({
      id: "reviewer",
      frontmatter: { name: "reviewer", description: "Reviews diffs carefully" },
      body: "# Reviewer body",
    });
    render(<AgentsPane repoScope={null} />);

    fireEvent.click(await screen.findByRole("button", { name: /reviewer/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^edit$/i }));

    const description = await screen.findByRole("textbox", { name: /description/i });
    fireEvent.change(description, { target: { value: "Reviews diffs carefully" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(updateAgent).toHaveBeenCalledWith("reviewer", {
        frontmatter: { description: "Reviews diffs carefully" },
      }),
    );
  });
});
