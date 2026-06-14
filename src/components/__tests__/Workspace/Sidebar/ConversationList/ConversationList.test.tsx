import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConversationList } from "@/components/Workspace/Sidebar/ConversationList/ConversationList";
import type { SessionStatus, SessionSummary } from "@/hooks/useSessions";
import type { Project } from "@/lib/types";
import { ConversationStatus, useConversationStatusStore } from "@/store/dashboard/useConversationStatusStore";
import { useConversationTitlesStore } from "@/store/dashboard/useConversationTitlesStore";
import { usePinnedStore } from "@/store/dashboard/usePinnedStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

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
  useConversationTitlesStore.setState({ conversationTitles: {} });
  usePinnedStore.setState({ overrides: {} });
  useConversationStatusStore.setState({ statuses: {} });
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
    render(<ConversationList sessions={[session("a")]} onChanged={vi.fn()} />);
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
        onChanged={vi.fn()}
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
    render(<ConversationList sessions={[session("open-a")]} onChanged={vi.fn()} />);

    // Appears once, via the Pinned group (its session title), not the tab title.
    expect(screen.getByText("Title open-a")).toBeInTheDocument();
    expect(screen.queryByText("Open one")).not.toBeInTheDocument();
  });

  it("opens a pinned-not-open session as a new session tab on click", () => {
    useWorkspaceStore.setState({
      dashboards: [{ id: "d1", scope: { kind: "project", project }, cwd: project.path, activeTabId: "", tabs: [] }],
      activeDashboardId: "d1",
    });
    render(<ConversationList sessions={[session("pinned-x", { pinned: true })]} onChanged={vi.fn()} />);

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
    render(<ConversationList sessions={[session("pin-a")]} onChanged={vi.fn()} />);

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
    render(<ConversationList sessions={[session("open-a")]} onChanged={vi.fn()} />);

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
    render(<ConversationList sessions={[session("pinned-y", { pinned: true })]} onChanged={vi.fn()} />);

    const row = screen.getByText("Title pinned-y").closest(".group") as HTMLElement;
    openRowMenu(row);
    fireEvent.click(await screen.findByText("Unpin"));

    await waitFor(() => expect(ipc.unpinConversation).toHaveBeenCalledWith("pinned-y"));
    expect(usePinnedStore.getState().overrides["pinned-y"]).toBe(false);
  });

  it("drives the dot from the per-convId status (running pulses, waiting yellow no pulse, absent→idle)", () => {
    // Three open chat tabs sharing the same agentName but distinct claudeSessionIds.
    // conv-absent has NO entry in the status store → must resolve to idle.
    useWorkspaceStore.setState({
      dashboards: [
        {
          id: "d1", scope: { kind: "project", project }, cwd: project.path, activeTabId: "t-run",
          tabs: [
            { id: "t-run", kind: "chat", title: "Running chat", agentName: "coder", claudeSessionId: "conv-run" },
            { id: "t-wait", kind: "chat", title: "Waiting chat", agentName: "coder", claudeSessionId: "conv-wait" },
            { id: "t-idle", kind: "chat", title: "Idle chat", agentName: "coder", claudeSessionId: "conv-absent" },
          ],
        },
      ],
      activeDashboardId: "d1",
    });
    // Per-id status, independent of any agentName/event-store state.
    useConversationStatusStore.setState({
      statuses: { "conv-run": ConversationStatus.Running, "conv-wait": ConversationStatus.Waiting },
    });

    render(<ConversationList sessions={[]} onChanged={vi.fn()} />);

    const runRow = screen.getByText("Running chat").closest(".group") as HTMLElement;
    const waitRow = screen.getByText("Waiting chat").closest(".group") as HTMLElement;
    const idleRow = screen.getByText("Idle chat").closest(".group") as HTMLElement;

    // The leading status dot is a span carrying its status as `title`.
    const runDot = within(runRow).getByTitle("running");
    const waitDot = within(waitRow).getByTitle("waiting");
    const idleDot = within(idleRow).getByTitle("idle");

    // Only running pulses (green); waiting is steady yellow; absent id → muted idle.
    // The StatusDot primitive applies the pulse via the `animate-pulse` class.
    expect(runDot).toHaveStyle({ backgroundColor: "#22c55e" });
    expect(runDot).toHaveClass("animate-pulse");
    expect(waitDot).toHaveStyle({ backgroundColor: "#eab308" });
    expect(waitDot).not.toHaveClass("animate-pulse");
    expect(idleDot).not.toHaveClass("animate-pulse");
  });
});
