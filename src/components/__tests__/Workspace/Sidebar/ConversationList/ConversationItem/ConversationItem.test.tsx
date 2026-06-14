import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConversationItem, type ConversationItemProps } from "@/components/Workspace/Sidebar/ConversationList/ConversationItem/ConversationItem";
import { ConversationStatus } from "@/store/useConversationStatusStore";
import { useConversationTitlesStore } from "@/store/useConversationTitlesStore";
import { usePinnedStore } from "@/store/usePinnedStore";

const ipc = {
  pinConversation: vi.fn().mockResolvedValue(undefined),
  unpinConversation: vi.fn().mockResolvedValue(undefined),
  archiveConversation: vi.fn().mockResolvedValue(undefined),
  unarchiveConversation: vi.fn().mockResolvedValue(undefined),
  softDeleteConversation: vi.fn().mockResolvedValue(undefined),
};

function makeProps(over: Partial<ConversationItemProps> = {}): ConversationItemProps {
  return {
    convId: "c1",
    title: "My conversation",
    isActive: false,
    status: ConversationStatus.Idle,
    pinned: false,
    onActivate: vi.fn(),
    onChanged: vi.fn(),
    ...over,
  };
}

beforeEach(() => {
  Object.assign(window, { api: ipc });
  useConversationTitlesStore.setState({ conversationTitles: {} });
  usePinnedStore.setState({ overrides: {} });
});

afterEach(() => {
  Object.values(ipc).forEach((fn) => fn.mockClear());
});

// Radix DropdownMenu uses pointer capture (absent in jsdom). Open via keyboard:
// the first button is the ⋯ menu trigger (rendered before the row button).
function openMenu() {
  const trigger = screen.getAllByRole("button")[0];
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
}

describe("ConversationItem context menu", () => {
  it("offers the full action set: Rename, Copy session id, Pin, Archive, Delete", async () => {
    render(<ConversationItem {...makeProps()} />);
    openMenu();
    await screen.findByText("Rename…");
    expect(screen.getByText("Copy session id")).toBeInTheDocument();
    expect(screen.getByText("Pin to top")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("copies the convId (claudeSessionId) to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ConversationItem {...makeProps({ convId: "claude-side-id" })} />);
    openMenu();
    fireEvent.click(await screen.findByText("Copy session id"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("claude-side-id"));
  });

  it("archives via the convId and refreshes the list", async () => {
    const onChanged = vi.fn();
    render(<ConversationItem {...makeProps({ onChanged })} />);
    openMenu();
    fireEvent.click(await screen.findByText("Archive"));
    await waitFor(() => expect(ipc.archiveConversation).toHaveBeenCalledWith("c1"));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("soft-deletes via the convId and refreshes the list", async () => {
    const onChanged = vi.fn();
    render(<ConversationItem {...makeProps({ onChanged })} />);
    openMenu();
    fireEvent.click(await screen.findByText("Delete"));
    await waitFor(() => expect(ipc.softDeleteConversation).toHaveBeenCalledWith("c1"));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("pins via the convId (optimistic store + IPC)", async () => {
    render(<ConversationItem {...makeProps()} />);
    openMenu();
    fireEvent.click(await screen.findByText("Pin to top"));
    await waitFor(() => expect(ipc.pinConversation).toHaveBeenCalledWith("c1"));
    expect(usePinnedStore.getState().overrides["c1"]).toBe(true);
  });

  it("unpins a pinned row via the convId", async () => {
    render(<ConversationItem {...makeProps({ pinned: true })} />);
    openMenu();
    fireEvent.click(await screen.findByText("Unpin"));
    await waitFor(() => expect(ipc.unpinConversation).toHaveBeenCalledWith("c1"));
    expect(usePinnedStore.getState().overrides["c1"]).toBe(false);
  });

  it("renders no menu trigger when convId is undefined (only the row button)", () => {
    render(<ConversationItem {...makeProps({ convId: undefined, title: "Fresh chat" })} />);
    // The row remains clickable, but there is no extra ⋯ menu trigger button.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("Fresh chat")).toBeInTheDocument();
  });
});
