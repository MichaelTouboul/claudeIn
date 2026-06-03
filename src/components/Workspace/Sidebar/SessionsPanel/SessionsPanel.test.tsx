import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionStatus, SessionSummary } from "@/hooks/useSessions";
import { ProjectProvider } from "@/store/ProjectContext";
import { useEventsStore } from "@/store/useEventsStore";
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

  it("shows a status badge on recent rows", () => {
    renderPanel([session("recent-a", "recent")]);
    expect(screen.getByText("recent")).toBeInTheDocument();
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
