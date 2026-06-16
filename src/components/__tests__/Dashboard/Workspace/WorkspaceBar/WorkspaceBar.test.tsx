import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { WorkspaceBar } from "@/components/Dashboard/Workspace/WorkspaceBar/WorkspaceBar";
import type { Project } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

function proj(id: string, logoDataUrl: string | null): Project {
  return {
    id,
    name: id,
    path: `/p/${id}`,
    claudeDir: `/p/${id}/.claude`,
    hasAgents: false,
    hasSkills: false,
    hasSettings: false,
    agentCount: 0,
    skillCount: 0,
    logoDataUrl,
  };
}

const initial = useWorkspaceStore.getState();
beforeEach(() => {
  useWorkspaceStore.setState(initial, true);
  useAppStore.setState({ selectedProject: null });
});

describe("WorkspaceBar folder tab logo", () => {
  it("shows the persisted logo on a project (folder) tab when present", () => {
    const dataUrl = "data:image/png;base64,AAAA";
    useWorkspaceStore.getState().openDashboard(proj("alpha", dataUrl));
    render(<WorkspaceBar />);
    const logo = screen.getByRole("img", { name: /alpha/i });
    expect(logo).toHaveAttribute("src", dataUrl);
  });

  it("falls back to tinted initials on a folder tab without a logo", () => {
    useWorkspaceStore.getState().openDashboard(proj("beta", null));
    render(<WorkspaceBar />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
