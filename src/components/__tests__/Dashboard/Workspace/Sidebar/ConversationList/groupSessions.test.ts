import { describe, expect, it } from "vitest";

import {
  groupSessions,
  PINNED_GROUP_LABEL,
} from "@/components/Dashboard/Workspace/Sidebar/ConversationList/groupSessions";
import type { SessionStatus, SessionSummary } from "@/hooks/useSessions";

const NOW = new Date("2026-06-17T10:00:00").getTime();

function session(id: string, over: Partial<SessionSummary> = {}): SessionSummary {
  const status: SessionStatus = "recent";
  return {
    sessionId: id,
    filePath: `/sessions/${id}.jsonl`,
    agentName: null,
    title: `Title ${id}`,
    firstPrompt: null,
    messageCount: 3,
    branch: null,
    startedAt: null,
    lastActiveAt: new Date("2026-06-17T08:00:00").toISOString(),
    model: null,
    contextPercent: null,
    projectDirName: "proj",
    status,
    pinned: false,
    archived: false,
    pinnedAt: null,
    color: null,
    ...over,
  };
}

describe("groupSessions", () => {
  it("floats pinned sessions into a single Pinned group above time groups", () => {
    const groups = groupSessions(
      [
        session("a", { lastActiveAt: new Date("2026-06-17T09:00:00").toISOString() }),
        session("p", { pinned: true, pinnedAt: "2026-01-01T00:00:00Z" }),
      ],
      {},
      "",
      NOW,
    );
    expect(groups[0].label).toBe(PINNED_GROUP_LABEL);
    expect(groups[0].sessions.map((s) => s.sessionId)).toEqual(["p"]);
    // The pinned one is NOT duplicated into the Today bucket.
    const today = groups.find((g) => g.label === "Today");
    expect(today?.sessions.map((s) => s.sessionId)).toEqual(["a"]);
  });

  it("honors optimistic pin overrides over the DB flag", () => {
    const groups = groupSessions([session("a")], { a: true }, "", NOW);
    expect(groups[0].label).toBe(PINNED_GROUP_LABEL);
    expect(groups[0].sessions.map((s) => s.sessionId)).toEqual(["a"]);
  });

  it("buckets by relative time, newest first within a group", () => {
    const groups = groupSessions(
      [
        session("old", { lastActiveAt: new Date("2026-06-01T12:00:00").toISOString() }),
        session("y", { lastActiveAt: new Date("2026-06-16T12:00:00").toISOString() }),
        session("t1", { lastActiveAt: new Date("2026-06-17T07:00:00").toISOString() }),
        session("t2", { lastActiveAt: new Date("2026-06-17T09:00:00").toISOString() }),
      ],
      {},
      "",
      NOW,
    );
    const labels = groups.map((g) => g.label);
    expect(labels).toEqual(["Today", "Yesterday", "Older"]);
    expect(groups[0].sessions.map((s) => s.sessionId)).toEqual(["t2", "t1"]);
  });

  it("filters by title (case-insensitive)", () => {
    const groups = groupSessions(
      [session("a", { title: "Refactor auth" }), session("b", { title: "Set up CI" })],
      {},
      "auth",
      NOW,
    );
    const all = groups.flatMap((g) => g.sessions.map((s) => s.sessionId));
    expect(all).toEqual(["a"]);
  });

  it("drops empty groups", () => {
    const groups = groupSessions([session("a")], {}, "", NOW);
    expect(groups.every((g) => g.sessions.length > 0)).toBe(true);
  });
});
