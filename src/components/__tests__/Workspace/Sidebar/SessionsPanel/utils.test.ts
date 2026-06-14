import { describe, expect, it } from "vitest";

import { capRecent, partitionSessions } from "@/components/Workspace/Sidebar/SessionsPanel/utils";
import type { SessionStatus, SessionSummary } from "@/hooks/useSessions";

function session(id: string, status: SessionStatus, over: Partial<SessionSummary> = {}): SessionSummary {
  return {
    sessionId: id,
    filePath: `/sessions/${id}.jsonl`,
    agentName: null,
    title: `Title ${id}`,
    firstPrompt: null,
    messageCount: 3,
    branch: null,
    startedAt: null,
    lastActiveAt: new Date().toISOString(),
    model: "claude-opus-4",
    projectDirName: "proj",
    status,
    pinned: false,
    archived: false,
    pinnedAt: null,
    ...over,
  };
}

describe("partitionSessions", () => {
  it("keeps live (and active-agent-driven) inline, archived separate, the rest in recent", () => {
    const { live, recent, archived } = partitionSessions(
      [
        session("live-a", "live"),
        session("driven-a", "recent", { agentName: "builder" }),
        session("recent-a", "recent"),
        session("idle-a", "idle"),
        session("arch-a", "recent", { archived: true }),
      ],
      new Set(["builder"]),
    );

    expect(live.map((s) => s.sessionId)).toEqual(["live-a", "driven-a"]);
    // recent now folds idle in — it is the full non-live, non-archived history.
    expect(recent.map((s) => s.sessionId)).toEqual(["recent-a", "idle-a"]);
    expect(archived.map((s) => s.sessionId)).toEqual(["arch-a"]);
  });

  it("preserves input order within each tier (backend pinned-first sort)", () => {
    const { recent } = partitionSessions(
      [session("b", "recent"), session("a", "idle"), session("c", "recent")],
      new Set(),
    );
    expect(recent.map((s) => s.sessionId)).toEqual(["b", "a", "c"]);
  });
});

describe("capRecent", () => {
  it("returns all inline and no overflow when at or under the limit", () => {
    const list = Array.from({ length: 10 }, (_, i) => session(`s${i}`, "recent"));
    const { inline, overflow } = capRecent(list, 10);
    expect(inline).toHaveLength(10);
    expect(overflow).toHaveLength(0);
  });

  it("caps inline to the first `limit` (most recent) and routes the rest to overflow", () => {
    const list = Array.from({ length: 14 }, (_, i) => session(`s${i}`, "recent"));
    const { inline, overflow } = capRecent(list, 10);
    expect(inline.map((s) => s.sessionId)).toEqual([
      "s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9",
    ]);
    expect(overflow.map((s) => s.sessionId)).toEqual(["s10", "s11", "s12", "s13"]);
  });

  it("defaults the limit to 10", () => {
    const list = Array.from({ length: 12 }, (_, i) => session(`s${i}`, "recent"));
    const { inline, overflow } = capRecent(list);
    expect(inline).toHaveLength(10);
    expect(overflow.map((s) => s.sessionId)).toEqual(["s10", "s11"]);
  });

  it("handles an empty list", () => {
    const { inline, overflow } = capRecent([]);
    expect(inline).toEqual([]);
    expect(overflow).toEqual([]);
  });
});
