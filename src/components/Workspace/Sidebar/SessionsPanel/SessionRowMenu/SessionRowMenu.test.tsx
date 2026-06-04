import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionSummary } from "@/hooks/useSessions";

import { SessionRowMenu } from "./SessionRowMenu";

const ipc = {
  pinConversation: vi.fn().mockResolvedValue(undefined),
  unpinConversation: vi.fn().mockResolvedValue(undefined),
  archiveConversation: vi.fn().mockResolvedValue(undefined),
  unarchiveConversation: vi.fn().mockResolvedValue(undefined),
  softDeleteConversation: vi.fn().mockResolvedValue(undefined),
  restoreConversation: vi.fn().mockResolvedValue(undefined),
  deleteConversationFromDisk: vi.fn().mockResolvedValue(true),
};

function makeSession(over: Partial<SessionSummary> = {}): SessionSummary {
  return {
    sessionId: "s1", filePath: "/sessions/s1.jsonl", agentName: null, title: "My session",
    firstPrompt: null, messageCount: 2, branch: null, startedAt: null, lastActiveAt: null,
    model: null, projectDirName: "proj", status: "recent",
    pinned: false, archived: false, pinnedAt: null, ...over,
  };
}

beforeEach(() => {
  Object.assign(window, { api: ipc });
});

afterEach(() => {
  Object.values(ipc).forEach((fn) => fn.mockClear());
});

// Radix DropdownMenu uses pointer capture (absent in jsdom). Open via the
// keyboard path instead: focus the trigger and press Enter.
function openMenu() {
  const trigger = screen.getByRole("button");
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
}

describe("SessionRowMenu", () => {
  it("pins an unpinned session via the right IPC and refreshes", async () => {
    const onChanged = vi.fn();
    render(<SessionRowMenu session={makeSession()} onChanged={onChanged} />);
    openMenu();
    fireEvent.click(await screen.findByText("Pin to top"));
    await waitFor(() => expect(ipc.pinConversation).toHaveBeenCalledWith("s1"));
  });

  it("unpins a pinned session", async () => {
    render(<SessionRowMenu session={makeSession({ pinned: true })} onChanged={vi.fn()} />);
    openMenu();
    fireEvent.click(await screen.findByText("Unpin"));
    await waitFor(() => expect(ipc.unpinConversation).toHaveBeenCalledWith("s1"));
  });

  it("archives, and offers Unarchive when already archived", async () => {
    const { rerender } = render(<SessionRowMenu session={makeSession()} onChanged={vi.fn()} />);
    openMenu();
    fireEvent.click(await screen.findByText("Archive"));
    await waitFor(() => expect(ipc.archiveConversation).toHaveBeenCalledWith("s1"));

    rerender(<SessionRowMenu session={makeSession({ archived: true })} onChanged={vi.fn()} />);
    openMenu();
    fireEvent.click(await screen.findByText("Unarchive"));
    await waitFor(() => expect(ipc.unarchiveConversation).toHaveBeenCalledWith("s1"));
  });

  it("soft-deletes via Delete (reversible)", async () => {
    render(<SessionRowMenu session={makeSession()} onChanged={vi.fn()} />);
    openMenu();
    fireEvent.click(await screen.findByText("Delete"));
    await waitFor(() => expect(ipc.softDeleteConversation).toHaveBeenCalledWith("s1"));
    expect(ipc.deleteConversationFromDisk).not.toHaveBeenCalled();
  });

  it("only does the disk delete behind the confirm dialog", async () => {
    render(<SessionRowMenu session={makeSession()} onChanged={vi.fn()} />);
    openMenu();
    fireEvent.click(await screen.findByText("Delete permanently…"));
    // Opening the item does not delete; the dialog confirm does.
    expect(ipc.deleteConversationFromDisk).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Delete permanently" }));
    expect(ipc.deleteConversationFromDisk).toHaveBeenCalledWith("/sessions/s1.jsonl");
  });

  it("hides clear/compact for non-piloted sessions", async () => {
    render(<SessionRowMenu session={makeSession()} onChanged={vi.fn()} />);
    openMenu();
    await screen.findByText("Pin to top"); // menu is open
    expect(screen.queryByText("Clear (soon)")).toBeNull();
    expect(screen.queryByText("Compact (soon)")).toBeNull();
  });

  it("shows clear/compact (deferred) when piloted", async () => {
    render(<SessionRowMenu session={makeSession()} piloted onChanged={vi.fn()} />);
    openMenu();
    expect(await screen.findByText("Clear (soon)")).toBeInTheDocument();
    expect(screen.getByText("Compact (soon)")).toBeInTheDocument();
  });
});
