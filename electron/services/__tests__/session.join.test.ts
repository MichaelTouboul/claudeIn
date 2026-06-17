// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// listSessions LEFT-JOINs conversation_meta (via listMeta). Both the transcript
// base and the DB derive from HOME, so point HOME at one temp dir and init the
// DB before importing the service.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-session-join-"));
process.env.HOME = tmpHome;

const { initDb } = await import("../core/db");
const meta = await import("../conversation/conversation.meta");
const { listSessions } = await import("../session/session.service");

const PROJECT_PATH = "/Users/x/join-project";

function sessionsDir(): string {
  const encoded = PROJECT_PATH.replace(/\//g, "-");
  return path.join(tmpHome, ".claude", "projects", encoded);
}

function writeSession(id: string, mtimeMsAgo: number): void {
  const dir = sessionsDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.jsonl`);
  // A real interactive session begins with interactive-metadata lines (so it is
  // not mistaken for a one-shot `--print` helper transcript and filtered out).
  const meta = JSON.stringify({ type: "last-prompt", value: "hi" });
  const line = JSON.stringify({ type: "user", promptId: "p1", timestamp: new Date().toISOString(), message: { content: "hi" } });
  fs.writeFileSync(file, meta + "\n" + line + "\n", "utf-8");
  const when = new Date(Date.now() - mtimeMsAgo);
  fs.utimesSync(file, when, when);
}

beforeAll(async () => {
  await initDb();
});

beforeEach(() => {
  fs.rmSync(sessionsDir(), { recursive: true, force: true });
  for (const m of meta.listMeta()) {
    meta.unpin(m.sessionId);
    meta.unarchive(m.sessionId);
    meta.restore(m.sessionId);
  }
});

describe("listSessions × conversation_meta join", () => {
  it("hides soft-deleted sessions from the list", async () => {
    writeSession("keep", 5_000);
    writeSession("gone", 5_000);
    meta.softDelete("gone");

    const ids = (await listSessions(PROJECT_PATH)).map((s) => s.sessionId);
    expect(ids).toContain("keep");
    expect(ids).not.toContain("gone");
  });

  it("orders pinned sessions first, regardless of mtime", async () => {
    writeSession("fresh", 1_000); // most recent
    writeSession("old", 5 * 60 * 60 * 1000); // 5h ago
    meta.pin("old"); // pinning the older one should float it to the top

    const sessions = await listSessions(PROJECT_PATH);
    expect(sessions[0].sessionId).toBe("old");
    expect(sessions[0].pinned).toBe(true);
    expect(sessions.find((s) => s.sessionId === "fresh")?.pinned).toBe(false);
  });

  it("flags archived sessions (still listed, partitioned client-side)", async () => {
    writeSession("arch", 5_000);
    meta.archive("arch");

    const row = (await listSessions(PROJECT_PATH)).find((s) => s.sessionId === "arch");
    expect(row?.archived).toBe(true);
  });

  it("defaults pinned/archived to false when no meta row exists", async () => {
    writeSession("plain", 5_000);
    const row = (await listSessions(PROJECT_PATH)).find((s) => s.sessionId === "plain");
    expect(row?.pinned).toBe(false);
    expect(row?.archived).toBe(false);
    expect(row?.pinnedAt).toBeNull();
  });
});
