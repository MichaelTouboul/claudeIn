import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionStatus, SessionSummary } from "@/hooks/useSessions";
import { useConversationTitlesStore } from "@/store/useConversationTitlesStore";
import { useEventsStore } from "@/store/useEventsStore";
import { usePinnedStore } from "@/store/usePinnedStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Project } from "@/types/dashboard.types";

import { ConversationList } from "./ConversationList";

const ipc = {
  pinConversation: vi.fn().mockResolvedValue(undefined),
  unpinConversation: vi.fn().mockResolvedValue(undefined),
};

const project: Project = {
  id: "p1", name: "Proj", path: "/Users/x/proj", claudeDir: "/Users/x/proj/.claude",
  hasAgents: true, hasSkills: false, hasSettings: false, agentCount: 1, skillCount: 0,
};

function session(id: string, over: Partial<SessionSummary> = {}): SessionSummary {
  const status: SessionStatus = "recent";
  return {
    sessionId: id, filePath: `/sessions/${id}.jsonl`, agentName: null, title: `Title ${id}`,
    firstPrompt: null, messageCount: 3, branch: null, startedAt: null,
    lastActiveAt: new Date().toISOString(), model: null, projectDirName: "proj",
    status, pinned: false, archived: false, pinnedAt: null, ...over,
  };
}

beforeEach(() => {
  Object.assign(window, { api: ipc });
  useEventsStore.setState({ activeAgents: new Set(), waitingAgents: new Set(), agentContexts: new Map() });
  useConversationTitlesStore.setState({ conversationTitles: {} });
  usePinnedStore.setState({ overrides: {} });
  useWorkspaceStore.setState({ dashboards: [], activeDashboardId: null });
});

afterEach(() => {
  Object.values(ipc).forEach((fn) => fn.mockClear());
});

// Radix DropdownMenu uses pointer capture (absent in jsdom). Open via keyboard:
// focus the row's menu trigger (the first button is the ⋯ menu) and press Enter.
function openRowMenu(row: HTMLElement) {
  const trigger = within(row).getAllByRole("button")[0];
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
}

describe("ConversationList", () => {
  it("shows the empty state when there are no pinned sessions and no open tabs", () => {
    useWorkspaceStore.setState({
      dashboards: [{ id: "d1", scope: { kind: "project", project }, cwd: project.path, activeTabId: "", tabs: [] }],
      activeDashboardId: "d1",
    });
    render(<ConversationList sessions={[session("a")]} />);
    expect(screen.getByText("No active conversations.")).toBeInTheDocument();
  });

  it("renders a Pinned group from pinned sessions, including one not open as a tab", () => {
    useWorkspaceStore.setState({
      dashboards: [
        {
          id: "d1", scope: { kind: "project", project }, cwd: project.path, activeTabId: "t-open",
          tabs: [{ id: "t-open", kind: "session", title: "Open one", sessionId: "open-a", sessionFilePath: "/sessions/open-a.jsonl" }],
        },
      ],
      activeDashboardId: "d1",
    });
    render(
      <ConversationList
        sessions={[
          session("pinned-db", { pinned: true, pinnedAt: "2026-01-01T00:00:00Z" }),
          session("open-a"),
        ]}
      />,
    );

    // Pinned tier header + the pinned session (which has NO open tab) is shown.
    expect(screen.getByText("Pinned")).toBeInTheDocument();
    expect(screen.getByText("Title pinned-db")).toBeInTheDocument();
    // The non-pinned open tab shows under Open.
    expect(screen.getByText("Open one")).toBeInTheDocument();
  });

  it("dedups a pinned+open conversation to a single Pinned row (not in Open)", () => {
    usePinnedStore.setState({ overrides: { "open-a": true } });
    useWorkspaceStore.setState({
      dashboards: [
        {
          id: "d1", scope: { kind: "project", project }, cwd: project.path, activeTabId: "t-open",
          tabs: [{ id: "t-open", kind: "session", title: "Open one", sessionId: "open-a", sessionFilePath: "/sessions/open-a.jsonl" }],
        },
      ],
      activeDashboardId: "d1",
    });
    render(<ConversationList sessions={[session("open-a")]} />);

    // Appears once, via the Pinned group (its session title), not the tab title.
    expect(screen.getByText("Title open-a")).toBeInTheDocument();
    expect(screen.queryByText("Open one")).not.toBeInTheDocument();
  });

  it("opens a pinned-not-open session as a new session tab on click", () => {
    useWorkspaceStore.setState({
      dashboards: [{ id: "d1", scope: { kind: "project", project }, cwd: project.path, activeTabId: "", tabs: [] }],
      activeDashboardId: "d1",
    });
    render(<ConversationList sessions={[session("pinned-x", { pinned: true })]} />);

    fireEvent.click(screen.getByText("Title pinned-x"));
    const tabs = useWorkspaceStore.getState().dashboards[0].tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toMatchObject({ kind: "session", sessionId: "pinned-x", sessionFilePath: "/sessions/pinned-x.jsonl" });
  });

  it("activates the existing tab when a pinned-open session is clicked", () => {
    useWorkspaceStore.setState({
      dashboards: [
        {
          id: "d1", scope: { kind: "project", project }, cwd: project.path, activeTabId: "other",
          tabs: [
            { id: "other", kind: "chat", title: "Chat" },
            { id: "t-pin", kind: "session", title: "Pinned tab", sessionId: "pin-a", sessionFilePath: "/sessions/pin-a.jsonl" },
          ],
        },
      ],
      activeDashboardId: "d1",
    });
    usePinnedStore.setState({ overrides: { "pin-a": true } });
    render(<ConversationList sessions={[session("pin-a")]} />);

    fireEvent.click(screen.getByText("Title pin-a"));
    expect(useWorkspaceStore.getState().dashboards[0].activeTabId).toBe("t-pin");
    // No new tab was created.
    expect(useWorkspaceStore.getState().dashboards[0].tabs).toHaveLength(2);
  });

  it("⋯ Pin sets the optimistic store and calls pinConversation", async () => {
    useWorkspaceStore.setState({
      dashboards: [
        {
          id: "d1", scope: { kind: "project", project }, cwd: project.path, activeTabId: "t-open",
          tabs: [{ id: "t-open", kind: "session", title: "Open one", sessionId: "open-a", sessionFilePath: "/sessions/open-a.jsonl" }],
        },
      ],
      activeDashboardId: "d1",
    });
    render(<ConversationList sessions={[session("open-a")]} />);

    const row = screen.getByText("Open one").closest(".group") as HTMLElement;
    openRowMenu(row);
    fireEvent.click(await screen.findByText("Pin to top"));

    await waitFor(() => expect(ipc.pinConversation).toHaveBeenCalledWith("open-a"));
    expect(usePinnedStore.getState().overrides["open-a"]).toBe(true);
  });

  it("⋯ Unpin on a pinned row sets the store false and calls unpinConversation", async () => {
    useWorkspaceStore.setState({
      dashboards: [{ id: "d1", scope: { kind: "project", project }, cwd: project.path, activeTabId: "", tabs: [] }],
      activeDashboardId: "d1",
    });
    render(<ConversationList sessions={[session("pinned-y", { pinned: true })]} />);

    const row = screen.getByText("Title pinned-y").closest(".group") as HTMLElement;
    openRowMenu(row);
    fireEvent.click(await screen.findByText("Unpin"));

    await waitFor(() => expect(ipc.unpinConversation).toHaveBeenCalledWith("pinned-y"));
    expect(usePinnedStore.getState().overrides["pinned-y"]).toBe(false);
  });
});
