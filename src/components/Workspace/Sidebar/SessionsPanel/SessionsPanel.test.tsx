import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionStatus, SessionSummary } from "@/hooks/useSessions";
import { ProjectProvider } from "@/store/ProjectContext";
import { useEventsStore } from "@/store/useEventsStore";
import { usePinnedStore } from "@/store/usePinnedStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Project } from "@/types/dashboard.types";

import { SessionsPanel } from "./SessionsPanel";

type EventCb = (data: unknown) => void;

const { watchSessions, unwatchSessions, onEvent, emit } = vi.hoisted(() => {
  const listeners: EventCb[] = [];
  return {
    watchSessions: vi.fn<(p: string) => Promise<void>>().mockResolvedValue(undefined),
    unwatchSessions: vi.fn<(p: string) => Promise<void>>().mockResolvedValue(undefined),
    onEvent: vi.fn((cb: EventCb) => {
      listeners.push(cb);
      return () => {
        const i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
      };
    }),
    emit: (data: unknown) => listeners.forEach((l) => l(data)),
  };
});

const project: Project = {
  id: "p1", name: "Proj", path: "/Users/x/proj", claudeDir: "/Users/x/proj/.claude",
  hasAgents: true, hasSkills: false, hasSettings: false, agentCount: 1, skillCount: 0,
};

function session(id: string, status: SessionStatus, over: Partial<SessionSummary> = {}): SessionSummary {
  return {
    sessionId: id, filePath: `/sessions/${id}.jsonl`, agentName: null, title: `Title ${id}`,
    firstPrompt: null, messageCount: 3, branch: null, startedAt: null,
    lastActiveAt: new Date().toISOString(), model: "claude-opus-4", projectDirName: "proj",
    status, pinned: false, archived: false, pinnedAt: null, ...over,
  };
}

function renderPanel(sessions: SessionSummary[], refresh = vi.fn()) {
  return render(
    <ProjectProvider project={project}>
      <SessionsPanel sessions={sessions} loading={false} refresh={refresh} />
    </ProjectProvider> as ReactNode,
  );
}

beforeEach(() => {
  Object.assign(window, { api: { watchSessions, unwatchSessions, onEvent } });
  useEventsStore.setState({ activeAgents: new Set(), waitingAgents: new Set(), agentContexts: new Map() });
  useWorkspaceStore.setState({ dashboards: [], activeDashboardId: null });
  usePinnedStore.setState({ overrides: {} });
});

afterEach(() => {
  watchSessions.mockClear();
  unwatchSessions.mockClear();
  onEvent.mockClear();
  vi.useRealTimers();
});

describe("SessionsPanel", () => {
  it("renders the three tiers, scope-filtered to the given sessions", () => {
    renderPanel([
      session("live-a", "live"),
      session("recent-a", "recent"),
      session("idle-a", "idle"),
    ]);

    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Recent")).toBeInTheDocument();
    // Live + Recent tiers render inline; idle is behind "Load more".
    expect(screen.getByText("Title live-a")).toBeInTheDocument();
    expect(screen.getByText("Title recent-a")).toBeInTheDocument();
    expect(screen.queryByText("Title idle-a")).not.toBeInTheDocument();
    expect(screen.getByText(/Load more \(1\)/)).toBeInTheDocument();
  });

  it("promotes a driven (active-agent) session into the Live tier", () => {
    useEventsStore.setState({ activeAgents: new Set(["builder"]) });
    renderPanel([session("driven", "recent", { agentName: "builder" })]);

    // The recent-status session is promoted to Live because its agent is active;
    // it renders under the Live tier (no live voyant — that now lives in ACTIVITY).
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Title driven")).toBeInTheDocument();
    expect(screen.queryByLabelText("Running")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Waiting for input")).not.toBeInTheDocument();
  });

  it("no longer renders the status badge on recent rows", () => {
    renderPanel([session("recent-a", "recent")]);
    expect(screen.getByText("Title recent-a")).toBeInTheDocument();
    // The "recent" status badge was removed; only the title text shows it.
    expect(screen.queryByText("recent")).not.toBeInTheDocument();
  });

  it("hides a session already open in a tab of the active dashboard", () => {
    useWorkspaceStore.setState({
      dashboards: [
        {
          id: "d1",
          scope: { kind: "project", project },
          cwd: project.path,
          activeTabId: "t-open",
          tabs: [
            { id: "t-open", kind: "session", title: "Open one", sessionId: "recent-a", sessionFilePath: "/sessions/recent-a.jsonl" },
          ],
        },
      ],
      activeDashboardId: "d1",
    });
    renderPanel([session("recent-a", "recent"), session("recent-b", "recent")]);

    // recent-a is open in a session tab → excluded; recent-b still listed.
    expect(screen.queryByText("Title recent-a")).not.toBeInTheDocument();
    expect(screen.getByText("Title recent-b")).toBeInTheDocument();
  });

  it("keeps a PINNED session listed even when it is open in a tab (non-pinned open one is still hidden)", () => {
    useWorkspaceStore.setState({
      dashboards: [
        {
          id: "d1",
          scope: { kind: "project", project },
          cwd: project.path,
          activeTabId: "t-pinned",
          tabs: [
            { id: "t-pinned", kind: "session", title: "Pinned open", sessionId: "pinned-a", sessionFilePath: "/sessions/pinned-a.jsonl" },
            { id: "t-open", kind: "session", title: "Open one", sessionId: "recent-a", sessionFilePath: "/sessions/recent-a.jsonl" },
          ],
        },
      ],
      activeDashboardId: "d1",
    });
    renderPanel([
      session("pinned-a", "recent", { pinned: true }),
      session("recent-a", "recent"),
      session("recent-b", "recent"),
    ]);

    // Pinned + open → exempt from the open-tab hiding, stays in the sidebar.
    expect(screen.getByText("Title pinned-a")).toBeInTheDocument();
    // Non-pinned + open → hidden; not-open → listed.
    expect(screen.queryByText("Title recent-a")).not.toBeInTheDocument();
    expect(screen.getByText("Title recent-b")).toBeInTheDocument();
  });

  it("keeps an open session listed when only the optimistic pin override marks it pinned", () => {
    usePinnedStore.setState({ overrides: { "recent-a": true } });
    useWorkspaceStore.setState({
      dashboards: [
        {
          id: "d1",
          scope: { kind: "project", project },
          cwd: project.path,
          activeTabId: "t-open",
          tabs: [
            { id: "t-open", kind: "session", title: "Open one", sessionId: "recent-a", sessionFilePath: "/sessions/recent-a.jsonl" },
          ],
        },
      ],
      activeDashboardId: "d1",
    });
    // DB still says pinned:false, but the override (just-clicked Pin) exempts it.
    renderPanel([session("recent-a", "recent"), session("recent-b", "recent")]);

    expect(screen.getByText("Title recent-a")).toBeInTheDocument();
    expect(screen.getByText("Title recent-b")).toBeInTheDocument();
  });

  it("hides a session whose id matches an open live chat tab's claudeSessionId", () => {
    useWorkspaceStore.setState({
      dashboards: [
        {
          id: "d1",
          scope: { kind: "project", project },
          cwd: project.path,
          activeTabId: "t-chat",
          tabs: [{ id: "t-chat", kind: "chat", title: "Chat", claudeSessionId: "recent-a" }],
        },
      ],
      activeDashboardId: "d1",
    });
    renderPanel([session("recent-a", "recent"), session("recent-b", "recent")]);

    expect(screen.queryByText("Title recent-a")).not.toBeInTheDocument();
    expect(screen.getByText("Title recent-b")).toBeInTheDocument();
  });

  it("opens the older-sessions modal from Load more", async () => {
    renderPanel([session("recent-a", "recent"), session("idle-a", "idle")]);

    fireEvent.click(screen.getByText(/Load more \(1\)/));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Title idle-a")).toBeInTheDocument();
  });

  it("keeps archived sessions out of the main tiers and shows them in the modal's Archived section", async () => {
    renderPanel([
      session("recent-a", "recent"),
      session("arch-a", "recent", { archived: true }),
    ]);

    // Archived is partitioned out of the inline Recent tier.
    expect(screen.getByText("Title recent-a")).toBeInTheDocument();
    expect(screen.queryByText("Title arch-a")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Load more \(1\)/));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Archived")).toBeInTheDocument();
    expect(within(dialog).getByText("Title arch-a")).toBeInTheDocument();
  });

  it("places a pinned session at the top of its tier (backend order preserved)", () => {
    // Backend returns pinned-first; the panel preserves input order per tier.
    renderPanel([
      session("pinned-a", "recent", { pinned: true }),
      session("recent-b", "recent"),
    ]);
    const rows = screen.getAllByText(/^Title /).map((el) => el.textContent);
    expect(rows.indexOf("Title pinned-a")).toBeLessThan(rows.indexOf("Title recent-b"));
  });

  it("watches the scope on mount and refetches (debounced) on session_activity", async () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    renderPanel([session("live-a", "live")], refresh);

    expect(watchSessions).toHaveBeenCalledWith("/Users/x/proj");

    emit({ type: "session_activity", sessionId: "live-a" });
    expect(refresh).not.toHaveBeenCalled(); // debounced
    vi.advanceTimersByTime(500);
    expect(refresh).toHaveBeenCalledTimes(1);

    // Unrelated events do not trigger a refetch.
    emit({ type: "spawn_exit" });
    vi.advanceTimersByTime(500);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("unwatches the scope on unmount", async () => {
    const { unmount } = renderPanel([session("live-a", "live")]);
    await waitFor(() => expect(watchSessions).toHaveBeenCalled());
    unmount();
    expect(unwatchSessions).toHaveBeenCalledWith("/Users/x/proj");
  });
});
