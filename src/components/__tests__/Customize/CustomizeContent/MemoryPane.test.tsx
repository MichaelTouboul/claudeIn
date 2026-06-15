import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemoryPane } from "@/components/Customize/CustomizeContent/MemoryPane";
import type { MemoryEntry, MemorySnapshot } from "@/lib/types";

const getMemoryMirror = vi.fn<(p?: string) => Promise<MemorySnapshot>>();
const onMemoryChanged = vi.fn(() => () => {});

function entry(over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    source: "project-claude-md",
    path: "CLAUDE.md",
    scope: "project",
    size: 9626,
    firstLine: "# Project memory",
    hasImports: false,
    ...over,
  };
}

beforeEach(() => {
  getMemoryMirror.mockReset();
  onMemoryChanged.mockReset().mockReturnValue(() => {});
  window.api = { getMemoryMirror, onMemoryChanged } as unknown as Window["api"];
});

describe("MemoryPane", () => {
  it("lists each memory file with path, scope and a size badge", async () => {
    getMemoryMirror.mockResolvedValue({
      projectPath: null,
      entries: [entry(), entry({ source: "user-claude-md", path: "~/.claude/CLAUDE.md", scope: "user", size: 2355 })],
    });
    render(<MemoryPane repoScope={null} />);

    expect(await screen.findByText("CLAUDE.md")).toBeInTheDocument();
    expect(screen.getByText("9.4 KB")).toBeInTheDocument();
    expect(screen.getByText("~/.claude/CLAUDE.md")).toBeInTheDocument();
  });

  it("opens a read-only preview drawer when a file is clicked", async () => {
    getMemoryMirror.mockResolvedValue({ projectPath: null, entries: [entry()] });
    render(<MemoryPane repoScope={null} />);

    fireEvent.click(await screen.findByRole("button", { name: /CLAUDE\.md/i }));
    expect(await screen.findByText(/preview/i)).toBeInTheDocument();
    expect(screen.getByText("# Project memory")).toBeInTheDocument();
  });

  it("shows loading then empty states", async () => {
    getMemoryMirror.mockResolvedValue({ projectPath: null, entries: [] });
    render(<MemoryPane repoScope={null} />);
    await waitFor(() => expect(screen.getByText(/no memory files in this scope/i)).toBeInTheDocument());
  });
});
