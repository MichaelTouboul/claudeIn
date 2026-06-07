// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import type { SessionSummary } from "../types/session.types";

// session.service derives the sessions base from HOME via session.transcript's
// getProjectsBase (~/.claude/projects). Point HOME at a temp dir and import the
// module dynamically per test so listSessions reads our fixture transcripts.
let tmpHome: string;
let prevHome: string | undefined;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-session-status-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

const PROJECT_PATH = "/Users/x/some-project";

function sessionsDir(): string {
  const encoded = PROJECT_PATH.replace(/\//g, "-");
  return path.join(tmpHome, ".claude", "projects", encoded);
}

function writeSession(id: string, mtimeMsAgo: number): void {
  const dir = sessionsDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.jsonl`);
  const line = JSON.stringify({
    type: "user",
    promptId: "p1",
    timestamp: new Date().toISOString(),
    message: { content: "hello" },
  });
  fs.writeFileSync(file, line + "\n", "utf-8");
  const when = new Date(Date.now() - mtimeMsAgo);
  fs.utimesSync(file, when, when);
}

describe("deriveStatus thresholds", () => {
  it("classifies at the live / recent / idle boundaries", async () => {
    const { deriveStatus, LIVE_THRESHOLD_MS, RECENT_THRESHOLD_MS } = await import(
      "./session.service?fresh=derive"
    );
    const now = 1_000_000_000_000;
    const iso = (ageMs: number) => new Date(now - ageMs).toISOString();

    // live: strictly under 30s; the boundary itself is recent.
    expect(deriveStatus(iso(0), now)).toBe("live");
    expect(deriveStatus(iso(LIVE_THRESHOLD_MS - 1), now)).toBe("live");
    expect(deriveStatus(iso(LIVE_THRESHOLD_MS), now)).toBe("recent");

    // recent: under 6h; the boundary itself is idle.
    expect(deriveStatus(iso(RECENT_THRESHOLD_MS - 1), now)).toBe("recent");
    expect(deriveStatus(iso(RECENT_THRESHOLD_MS), now)).toBe("idle");

    // no timestamp → idle.
    expect(deriveStatus(null, now)).toBe("idle");
  });
});

describe("listSessions status", () => {
  it("assigns status per transcript mtime", async () => {
    const { listSessions, LIVE_THRESHOLD_MS, RECENT_THRESHOLD_MS } = await import(
      "./session.service?fresh=list"
    );
    writeSession("live-one", 5_000); // 5s ago → live
    writeSession("recent-one", LIVE_THRESHOLD_MS + 60_000); // ~1m ago → recent
    writeSession("idle-one", RECENT_THRESHOLD_MS + 60_000); // > 6h ago → idle

    const sessions = await listSessions(PROJECT_PATH);
    const byId = Object.fromEntries(sessions.map((s: SessionSummary) => [s.sessionId, s.status]));

    expect(byId["live-one"]).toBe("live");
    expect(byId["recent-one"]).toBe("recent");
    expect(byId["idle-one"]).toBe("idle");
  });
});
