import { describe, expect, it } from "vitest";

import type { LiveEvent } from "@/lib/types";

import { buildSegments } from "../useSessionWorkflow.segments";

const ev = (id: number, tool: string | null, at: string): LiveEvent => ({
  id,
  agent_name: "coder",
  session_id: "s",
  event_type: "tool",
  tool_name: tool,
  tokens_in: 0,
  tokens_out: 0,
  cost_usd: 0,
  created_at: at,
});

describe("buildSegments", () => {
  it("groups consecutive same-tool events into spans ordered by id", () => {
    const segs = buildSegments([
      ev(3, "Edit", "2026-06-09T10:00:10Z"),
      ev(1, "Read", "2026-06-09T10:00:00Z"),
      ev(2, "Read", "2026-06-09T10:00:05Z"),
    ]);

    // Sorted by id → Read, Read, Edit → two spans in id order.
    expect(segs.map((s) => s.tool)).toEqual(["Read", "Edit"]);
    expect(segs[0].startMs).toBe(Date.parse("2026-06-09T10:00:00Z"));
    // The Read span ends where the next (Edit) event begins.
    expect(segs[0].endMs).toBe(Date.parse("2026-06-09T10:00:10Z"));
    expect(segs[0].startMs).toBeLessThan(segs[0].endMs);
  });

  it("re-opens a span when the tool changes back to an earlier tool", () => {
    const segs = buildSegments([
      ev(1, "Read", "2026-06-09T10:00:00Z"),
      ev(2, "Edit", "2026-06-09T10:00:05Z"),
      ev(3, "Read", "2026-06-09T10:00:10Z"),
    ]);

    expect(segs.map((s) => s.tool)).toEqual(["Read", "Edit", "Read"]);
  });

  it("returns one span for a single event (endMs = its own created_at)", () => {
    const segs = buildSegments([ev(1, "Read", "2026-06-09T10:00:00Z")]);

    expect(segs).toHaveLength(1);
    expect(segs[0].tool).toBe("Read");
    expect(segs[0].startMs).toBe(Date.parse("2026-06-09T10:00:00Z"));
    expect(segs[0].endMs).toBe(Date.parse("2026-06-09T10:00:00Z"));
  });

  it("returns [] for no events", () => {
    expect(buildSegments([])).toEqual([]);
  });
});
