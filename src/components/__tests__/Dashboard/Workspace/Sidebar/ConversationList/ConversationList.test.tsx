import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConversationList } from "@/components/Dashboard/Workspace/Sidebar/ConversationList/ConversationList";
import type { SessionStatus, SessionSummary } from "@/hooks/useSessions";
import type { Project } from "@/lib/types";
import { ConversationStatus, useConversationStatusStore } from "@/store/dashboard/useConversationStatusStore";
import { useConversationTitlesStore } from "@/store/dashboard/useConversationTitlesStore";
import { useEventsStore } from "@/store/dashboard/useEventsStore";
import { usePinnedStore } from "@/store/dashboard/usePinnedStore";
import { type Dashboard, useWorkspaceStore } from "@/store/useWorkspaceStore";

const ipc = {
  pinConversation: vi.fn().mockResolvedValue(undefined),
  unpinConversation: vi.fn().mockResolvedValue(undefined),
};

const project: Project = {
  id: "p1", name: "Proj", path: "/Users/x/proj", claudeDir: "/Users/x/proj/.claude",
  hasAgents: true, hasSkills: false, hasSettings: false, agentCount: 1, skillCount: 0,
};

// A fixed-ish recency so a fresh session lands in "Today".
function session(id: string, over: Partial<SessionSummary> = {}): SessionSummary {
  const status: SessionStatus = "recent";
  return {
    sessionId: id, filePath: `/sessions/${id}.jsonl`, agentName: null, title: `Title ${id}`,
    firstPrompt: null, messageCount: 3, branch: null, startedAt: null,
    lastActiveAt: new Date().toISOString(), model: null, contextPercent: null,
    projectDirName: "proj", status, pinned: false, archived: false, pinnedAt: null, ...over,
  };
}

function dashboard(over: Partial<Dashboard> = {}): Dashboard {
  return {
    id: "d1",
    scope: { kind: "project", project },
    cwd: project.path,
    activeTabId: "",
    tabs: [],
    ...over,
  };
}

beforeEach(() => {
  Object.assign(window, { api: ipc });
  useConversationTitlesStore.setState({ conversationTitles: {} });
  usePinnedStore.setState({ overrides: {} });
  useConversationStatusStore.setState({ statuses: {} });
  useEventsStore.setState({ agentContexts: new Map(), sessionContexts: new Map(), presence: new Map() });
  useWorkspaceStore.setState({
    dashboards: [dashboard()],
    activeDashboardId: "d1",
  });
});

afterEach(() => {
  Object.values(ipc).forEach((fn) => fn.mockClear());
});

function openRowMenu(row: HTMLElement) {
  const trigger = within(row).getAllByRole("button")[0];
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
}

describe("ConversationList — redesigned Sessions list", () => {
  it("renders the search box and an empty state when there are no sessions", () => {
    render(<ConversationList sessions={[]} onChanged={vi.fn()} />);
    expect(screen.getByPlaceholderText("Search sessions…")).toBeInTheDocument();
    expect(screen.getByText("No conversations yet.")).toBeInTheDocument();
  });

  it("groups sessions under relative-time headers", () => {
    const today = new Date();
    const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000);
    render(
      <ConversationList
        sessions={[
          session("t", { title: "Today one", lastActiveAt: today.toISOString() }),
          session("y", { title: "Yesterday one", lastActiveAt: yesterday.toISOString() }),
        ]}
        onChanged={vi.fn()}
      />,
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText("Today one")).toBeInTheDocument();
    expect(screen.getByText("Yesterday one")).toBeInTheDocument();
  });

  it("floats pinned sessions into a Pinned group above the time groups", () => {
    render(
      <ConversationList
        sessions={[
          session("a", { title: "Normal" }),
          session("p", { title: "Pinned one", pinned: true, pinnedAt: "2026-01-01T00:00:00Z" }),
        ]}
        onChanged={vi.fn()}
      />,
    );
    expect(screen.getByText("Pinned")).toBeInTheDocument();
    expect(screen.getByText("Pinned one")).toBeInTheDocument();
  });

  it("filters rows by the search query (title)", () => {
    render(
      <ConversationList
        sessions={[session("a", { title: "Refactor auth" }), session("b", { title: "Set up CI" })]}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Search sessions…"), { target: { value: "auth" } });
    expect(screen.getByText("Refactor auth")).toBeInTheDocument();
    expect(screen.queryByText("Set up CI")).not.toBeInTheDocument();
  });

  it("shows the branch chip and the context bar, omitting each gracefully when null", () => {
    render(
      <ConversationList
        sessions={[
          session("withMeta", { title: "Has meta", branch: "feature/auth", contextPercent: 42 }),
          session("bare", { title: "No meta", branch: null, contextPercent: null }),
        ]}
        onChanged={vi.fn()}
      />,
    );
    expect(screen.getByText("feature/auth")).toBeInTheDocument();
    // One row has a context bar (42%), the other omits it.
    const bars = screen.getAllByTestId("session-context-bar");
    expect(bars).toHaveLength(1);
    expect(within(bars[0]).getByText("42%")).toBeInTheDocument();
  });

  it("styles the active row from the active tab and opens a session on click", () => {
    render(<ConversationList sessions={[session("x", { title: "Open me" })]} onChanged={vi.fn()} />);

    const btn = screen.getByText("Open me").closest("button") as HTMLElement;
    expect(btn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByText("Open me"));
    const tabs = useWorkspaceStore.getState().dashboards[0].tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toMatchObject({ kind: "session", sessionId: "x", sessionFilePath: "/sessions/x.jsonl" });
  });

  it("marks the row active when its conversation is the active tab", () => {
    useWorkspaceStore.setState({
      dashboards: [
        dashboard({
          activeTabId: "t-x",
          tabs: [{ id: "t-x", kind: "session", title: "Open me", sessionId: "x", sessionFilePath: "/sessions/x.jsonl" }],
        }),
      ],
      activeDashboardId: "d1",
    });
    render(<ConversationList sessions={[session("x", { title: "Open me" })]} onChanged={vi.fn()} />);
    const btn = screen.getByText("Open me").closest("button") as HTMLElement;
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the row context menu (Pin) wired", async () => {
    render(<ConversationList sessions={[session("a", { title: "Menu row" })]} onChanged={vi.fn()} />);

    const row = screen.getByText("Menu row").closest(".group") as HTMLElement;
    openRowMenu(row);
    fireEvent.click(await screen.findByText("Pin to top"));

    await waitFor(() => expect(ipc.pinConversation).toHaveBeenCalledWith("a"));
    expect(usePinnedStore.getState().overrides["a"]).toBe(true);
  });

  it("drives the leading status dot from the per-conversation status store", () => {
    useConversationStatusStore.setState({ statuses: { run: ConversationStatus.Running } });
    render(<ConversationList sessions={[session("run", { title: "Running" })]} onChanged={vi.fn()} />);
    const dot = screen.getByTitle("running");
    expect(dot).toHaveClass("animate-pulse");
  });

  it("caps the history and reveals more rows via Load more", () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      session(`s${i}`, { title: `Session ${i}`, lastActiveAt: new Date(Date.now() - i * 1000).toISOString() }),
    );
    render(<ConversationList sessions={many} onChanged={vi.fn()} />);

    // 12 shown initially → 3 hidden.
    expect(screen.getByText("Load more (3)")).toBeInTheDocument();
    expect(screen.queryByText("Session 14")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Load more (3)"));
    expect(screen.getByText("Session 14")).toBeInTheDocument();
  });

  it("prefers the backend live context percent (per claudeSessionId) over the transcript value", () => {
    // The backend pushes `session_context` keyed by claudeSessionId; the sidebar
    // row reads that one value, never re-deriving from tokens. Same number the
    // live agent bar shows for this conversation.
    useEventsStore.setState({ sessionContexts: new Map([["live", 73]]) });
    render(
      <ConversationList
        sessions={[session("live", { title: "Live row", agentName: "coder", contextPercent: 10 })]}
        onChanged={vi.fn()}
      />,
    );
    const bar = screen.getByTestId("session-context-bar");
    expect(within(bar).getByText("73%")).toBeInTheDocument();
  });
});
