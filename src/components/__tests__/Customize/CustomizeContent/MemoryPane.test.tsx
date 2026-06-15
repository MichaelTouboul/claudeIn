import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemoryPane } from "@/components/Customize/CustomizeContent/MemoryPane";
import type { MemoryEntry, MemorySnapshot } from "@/lib/types";

const getMemoryMirror = vi.fn<(p?: string) => Promise<MemorySnapshot>>();
const onMemoryChanged = vi.fn(() => () => {});
const readMemoryFile = vi.fn<(p: string, scope?: string) => Promise<string>>();
const writeMemoryFile = vi.fn();

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
  readMemoryFile.mockReset().mockResolvedValue("# Project memory\n\nfull body");
  writeMemoryFile.mockReset();
  window.api = {
    getMemoryMirror,
    onMemoryChanged,
    readMemoryFile,
    writeMemoryFile,
  } as unknown as Window["api"];
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

  it("opens an editor drawer that loads the file body by path", async () => {
    getMemoryMirror.mockResolvedValue({ projectPath: null, entries: [entry()] });
    render(<MemoryPane repoScope={null} />);

    fireEvent.click(await screen.findByRole("button", { name: /CLAUDE\.md/i }));
    await waitFor(() => expect(readMemoryFile).toHaveBeenCalledWith("CLAUDE.md", undefined));
    const editor = await screen.findByRole("textbox", { name: /edit CLAUDE\.md/i });
    expect(editor).toHaveValue("# Project memory\n\nfull body");
    // Save is disabled until the content is dirtied.
    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();
  });

  it("saves edited content via writeMemoryFile", async () => {
    getMemoryMirror.mockResolvedValue({ projectPath: null, entries: [entry()] });
    writeMemoryFile.mockResolvedValue({ ...entry(), size: 42, firstLine: "# Edited" });
    render(<MemoryPane repoScope={null} />);

    fireEvent.click(await screen.findByRole("button", { name: /CLAUDE\.md/i }));
    const editor = await screen.findByRole("textbox", { name: /edit CLAUDE\.md/i });
    fireEvent.change(editor, { target: { value: "# Edited\nnew text" } });

    const save = screen.getByRole("button", { name: /^save$/i });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);
    await waitFor(() =>
      expect(writeMemoryFile).toHaveBeenCalledWith("CLAUDE.md", "# Edited\nnew text", undefined),
    );
  });

  it("shows loading then empty states", async () => {
    getMemoryMirror.mockResolvedValue({ projectPath: null, entries: [] });
    render(<MemoryPane repoScope={null} />);
    await waitFor(() => expect(screen.getByText(/no memory files in this scope/i)).toBeInTheDocument());
  });
});
