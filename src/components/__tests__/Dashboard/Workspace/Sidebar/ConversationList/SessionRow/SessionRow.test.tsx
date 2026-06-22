import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionRow } from "@/components/Dashboard/Workspace/Sidebar/ConversationList/SessionRow/SessionRow";
import type { SessionSummary } from "@/hooks/useSessions";

const ipc = {
  pinConversation: vi.fn().mockResolvedValue(undefined),
  unpinConversation: vi.fn().mockResolvedValue(undefined),
  archiveConversation: vi.fn().mockResolvedValue(undefined),
  unarchiveConversation: vi.fn().mockResolvedValue(undefined),
  softDeleteConversation: vi.fn().mockResolvedValue(undefined),
  setConversationColor: vi.fn().mockResolvedValue(undefined),
};

function makeSession(over: Partial<SessionSummary> = {}): SessionSummary {
  return {
    sessionId: "s1", filePath: "/sessions/s1.jsonl", agentName: null, title: "My session",
    firstPrompt: null, messageCount: 2, branch: null, startedAt: null, lastActiveAt: null,
    model: null, contextPercent: null, projectDirName: "proj", status: "recent",
    pinned: false, archived: false, pinnedAt: null, color: null, ...over,
  };
}

function renderRow(over: Partial<SessionSummary> = {}) {
  return render(
    <SessionRow
      session={makeSession(over)}
      timeLabel="2h"
      pinned={false}
      contextPercent={null}
      isActive={false}
      status="idle"
      onActivate={vi.fn()}
      onChanged={vi.fn()}
    />,
  );
}

beforeEach(() => {
  Object.assign(window, { api: ipc });
});

afterEach(() => {
  Object.values(ipc).forEach((fn) => fn.mockClear());
});

describe("SessionRow color dot", () => {
  it("renders a color dot when the conversation has a color", () => {
    renderRow({ color: "red" });
    const dot = screen.getByLabelText("color red");
    expect(dot).toBeInTheDocument();
    expect(dot.className).toContain("agent-color-red");
  });

  it("renders no color dot when the color is null (Default)", () => {
    renderRow({ color: null });
    expect(screen.queryByLabelText(/^color /)).toBeNull();
  });

  it("ignores an unrecognized color value (no dot)", () => {
    renderRow({ color: "chartreuse" });
    expect(screen.queryByLabelText(/^color /)).toBeNull();
  });
});
