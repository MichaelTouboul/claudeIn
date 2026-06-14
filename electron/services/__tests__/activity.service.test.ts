// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { __resetActivityCache, getActivity } from "../session/activity.service";

let tmpHome: string;
let prevHome: string | undefined;
let projectsBase: string;

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-activity-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  projectsBase = path.join(tmpHome, ".claude", "projects");
  fs.mkdirSync(projectsBase, { recursive: true });
  __resetActivityCache();
});

afterEach(() => {
  process.env.HOME = prevHome;
  __resetActivityCache();
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function assistantLine(opts: {
  model: string;
  tin: number;
  tout: number;
  timestamp: string;
}): string {
  return JSON.stringify({
    type: "assistant",
    timestamp: opts.timestamp,
    message: {
      model: opts.model,
      usage: { input_tokens: opts.tin, output_tokens: opts.tout },
    },
  });
}

function writeTranscript(projectDir: string, file: string, lines: string[]): string {
  const dir = path.join(projectsBase, projectDir);
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(dir, file);
  fs.writeFileSync(full, lines.join("\n") + "\n");
  return full;
}

describe("activity.service getActivity", () => {
  it("aggregates today's messages, tokens and distinct sessions", () => {
    writeTranscript("-Users-me-proj", "a.jsonl", [
      assistantLine({ model: "opus", tin: 100, tout: 50, timestamp: isoDaysAgo(0) }),
      assistantLine({ model: "opus", tin: 10, tout: 5, timestamp: isoDaysAgo(0) }),
    ]);
    writeTranscript("-Users-me-proj2", "b.jsonl", [
      assistantLine({ model: "sonnet", tin: 1, tout: 1, timestamp: isoDaysAgo(0) }),
    ]);

    const snap = getActivity(7);
    expect(snap.today.messages).toBe(3);
    expect(snap.today.tokens).toBe(100 + 50 + 10 + 5 + 1 + 1);
    expect(snap.today.sessions).toBe(2); // two distinct transcript files
  });

  it("aggregates per model over the window, sorted by tokens desc", () => {
    writeTranscript("-p", "x.jsonl", [
      assistantLine({ model: "sonnet", tin: 5, tout: 5, timestamp: isoDaysAgo(1) }),
      assistantLine({ model: "opus", tin: 500, tout: 500, timestamp: isoDaysAgo(2) }),
      assistantLine({ model: "opus", tin: 0, tout: 0, timestamp: isoDaysAgo(3) }),
    ]);

    const snap = getActivity(7);
    expect(snap.byModel.map((m) => m.model)).toEqual(["opus", "sonnet"]);
    const opus = snap.byModel.find((m) => m.model === "opus");
    expect(opus?.tokens).toBe(1000);
    expect(opus?.messages).toBe(2);
  });

  it("groups by day across the window", () => {
    writeTranscript("-p", "x.jsonl", [
      assistantLine({ model: "opus", tin: 10, tout: 0, timestamp: isoDaysAgo(0) }),
      assistantLine({ model: "opus", tin: 20, tout: 0, timestamp: isoDaysAgo(2) }),
    ]);

    const snap = getActivity(7);
    expect(snap.byDay.length).toBe(7);
    const total = snap.byDay.reduce((s, d) => s + d.tokens, 0);
    expect(total).toBe(30);
    // ascending by date
    const dates = snap.byDay.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("excludes files whose mtime is older than the window", () => {
    const old = writeTranscript("-old", "old.jsonl", [
      assistantLine({ model: "opus", tin: 999, tout: 999, timestamp: isoDaysAgo(0) }),
    ]);
    // Force mtime well before the 7-day window even though the line is "today".
    const oldTime = (Date.now() - 30 * DAY_MS) / 1000;
    fs.utimesSync(old, oldTime, oldTime);

    writeTranscript("-fresh", "fresh.jsonl", [
      assistantLine({ model: "opus", tin: 7, tout: 0, timestamp: isoDaysAgo(0) }),
    ]);

    const snap = getActivity(7);
    expect(snap.today.tokens).toBe(7); // the old file's 1998 tokens are excluded
  });

  it("skips corrupt lines without throwing", () => {
    writeTranscript("-p", "x.jsonl", [
      "{ not json",
      assistantLine({ model: "opus", tin: 4, tout: 1, timestamp: isoDaysAgo(0) }),
      "}}}garbage",
    ]);

    const snap = getActivity(7);
    expect(snap.today.tokens).toBe(5);
    expect(snap.today.messages).toBe(1);
  });

  it("missing projects dir → empty snapshot, never throws", () => {
    fs.rmSync(projectsBase, { recursive: true, force: true });
    let snap: ReturnType<typeof getActivity> | undefined;
    expect(() => {
      snap = getActivity(7);
    }).not.toThrow();
    expect(snap?.today).toEqual({ messages: 0, tokens: 0, sessions: 0 });
    expect(snap?.byModel).toEqual([]);
    expect(snap?.byDay.length).toBe(7);
  });

  it("returns the same cached object within the TTL window", () => {
    writeTranscript("-p", "x.jsonl", [
      assistantLine({ model: "opus", tin: 10, tout: 0, timestamp: isoDaysAgo(0) }),
    ]);
    const first = getActivity(7);
    // Add a new file; without TTL expiry the cached snapshot must be returned.
    writeTranscript("-p2", "y.jsonl", [
      assistantLine({ model: "opus", tin: 999, tout: 0, timestamp: isoDaysAgo(0) }),
    ]);
    const second = getActivity(7);
    expect(second).toBe(first); // same object reference from cache
    expect(second.today.tokens).toBe(10); // not re-scanned
  });
});
