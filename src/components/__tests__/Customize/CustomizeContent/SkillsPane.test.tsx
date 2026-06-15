import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SkillsPane } from "@/components/Customize/CustomizeContent/SkillsPane";
import type { SkillsSnapshot } from "@/lib/types";

const getSkillsMirror = vi.fn<(p?: string) => Promise<SkillsSnapshot>>();
const onSkillsChanged = vi.fn(() => () => {});

function snapshot(skills: SkillsSnapshot["skills"]): SkillsSnapshot {
  return { projectPath: null, skills };
}

beforeEach(() => {
  getSkillsMirror.mockReset();
  onSkillsChanged.mockReset().mockReturnValue(() => {});
  window.api = { getSkillsMirror, onSkillsChanged } as unknown as Window["api"];
});

describe("SkillsPane", () => {
  it("renders a card per skill from the mirror with name, description and scope", async () => {
    getSkillsMirror.mockResolvedValue(
      snapshot([
        { name: "pdf-extract", description: "Pull text from PDFs", scope: "project", filePath: "/a", lineCount: 10, shadowed: false },
        { name: "changelog", description: "Draft a changelog", scope: "user", filePath: "/b", lineCount: 8, shadowed: false },
      ]),
    );
    render(<SkillsPane repoScope={null} />);

    expect(await screen.findByText("pdf-extract")).toBeInTheDocument();
    expect(screen.getByText("Pull text from PDFs")).toBeInTheDocument();
    expect(screen.getByText("changelog")).toBeInTheDocument();
    expect(screen.getByText("project")).toBeInTheDocument();
  });

  it("shows a loading state before the snapshot resolves", () => {
    getSkillsMirror.mockReturnValue(new Promise(() => {}));
    render(<SkillsPane repoScope={null} />);
    expect(screen.getByLabelText(/loading skills/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no skills", async () => {
    getSkillsMirror.mockResolvedValue(snapshot([]));
    render(<SkillsPane repoScope={null} />);
    await waitFor(() => expect(screen.getByText(/no skills in this scope/i)).toBeInTheDocument());
  });
});
