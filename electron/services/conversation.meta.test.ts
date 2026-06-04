// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// db.ts reads HOME at module load to compute the DB path, so set it before the
// dynamic imports below.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-convmeta-"));
process.env.HOME = tmpHome;

const { initDb, getDb } = await import("./db");
const meta = await import("./conversation.meta");
const { listSessions } = await import("./session.service");

beforeAll(async () => {
  await initDb();
});

describe("conversation_meta migration", () => {
  it("creates the table idempotently (initDb twice is safe)", async () => {
    await initDb();
    const cols = getDb()
      .prepare("PRAGMA table_info(conversation_meta)")
      .all()
      .map((r) => r.name);
    expect(cols).toEqual(
      expect.arrayContaining(["session_id", "pinned_at", "archived_at", "deleted_at", "note", "ai_title"])
    );
  });
});

describe("setAiTitle persistence", () => {
  it("round-trips through getMeta", () => {
    meta.setAiTitle("s-title", "Refactor the parser");
    expect(meta.getMeta("s-title")?.aiTitle).toBe("Refactor the parser");
  });

  it("overwrites a prior title and surfaces in listMeta", () => {
    meta.setAiTitle("s-title", "Updated title");
    expect(meta.getMeta("s-title")?.aiTitle).toBe("Updated title");
    const row = meta.listMeta().find((m) => m.sessionId === "s-title");
    expect(row?.aiTitle).toBe("Updated title");
  });

  it("aiTitle is null when never set", () => {
    meta.pin("s-no-title");
    expect(meta.getMeta("s-no-title")?.aiTitle).toBeNull();
  });
});

describe("listSessions coalesces the persisted ai_title", () => {
  const projectPath = "/tmp/proj-coalesce";
  const sessionsDir = path.join(tmpHome, ".claude", "projects", projectPath.replace(/\//g, "-"));

  function writeTranscript(sessionId: string, opts: { aiTitle?: string; firstPrompt: string }): void {
    fs.mkdirSync(sessionsDir, { recursive: true });
    const lines: string[] = [];
    if (opts.aiTitle) lines.push(JSON.stringify({ type: "ai-title", aiTitle: opts.aiTitle }));
    lines.push(
      JSON.stringify({
        type: "user",
        promptId: "p1",
        message: { content: opts.firstPrompt },
        timestamp: new Date().toISOString(),
      })
    );
    fs.writeFileSync(path.join(sessionsDir, `${sessionId}.jsonl`), lines.join("\n") + "\n");
  }

  it("prefers the DB ai_title over the jsonl title", async () => {
    writeTranscript("sess-db-wins", { aiTitle: "jsonl title", firstPrompt: "do the thing" });
    meta.setAiTitle("sess-db-wins", "db title");
    const sessions = await listSessions(projectPath);
    const s = sessions.find((x) => x.sessionId === "sess-db-wins");
    expect(s?.title).toBe("db title");
  });

  it("falls back to the jsonl title when there is no DB title", async () => {
    writeTranscript("sess-jsonl", { aiTitle: "only jsonl", firstPrompt: "do the thing" });
    const sessions = await listSessions(projectPath);
    const s = sessions.find((x) => x.sessionId === "sess-jsonl");
    expect(s?.title).toBe("only jsonl");
  });

  it("title is null (falls back to firstPrompt) when neither exists", async () => {
    writeTranscript("sess-none", { firstPrompt: "just a prompt" });
    const sessions = await listSessions(projectPath);
    const s = sessions.find((x) => x.sessionId === "sess-none");
    expect(s?.title).toBeNull();
    expect(s?.firstPrompt).toBe("just a prompt");
  });
});

describe("pin/archive/softDelete set + clear timestamps", () => {
  it("pin sets pinned_at; unpin clears it", () => {
    meta.pin("s-pin");
    expect(meta.getMeta("s-pin")?.pinnedAt).toBeTruthy();
    meta.unpin("s-pin");
    expect(meta.getMeta("s-pin")?.pinnedAt).toBeNull();
  });

  it("archive sets archived_at; unarchive clears it", () => {
    meta.archive("s-arch");
    expect(meta.getMeta("s-arch")?.archivedAt).toBeTruthy();
    meta.unarchive("s-arch");
    expect(meta.getMeta("s-arch")?.archivedAt).toBeNull();
  });

  it("softDelete sets deleted_at; restore clears it", () => {
    meta.softDelete("s-del");
    expect(meta.getMeta("s-del")?.deletedAt).toBeTruthy();
    meta.restore("s-del");
    expect(meta.getMeta("s-del")?.deletedAt).toBeNull();
  });

  it("flags are independent on the same row", () => {
    meta.pin("s-multi");
    meta.archive("s-multi");
    const row = meta.getMeta("s-multi");
    expect(row?.pinnedAt).toBeTruthy();
    expect(row?.archivedAt).toBeTruthy();
    expect(row?.deletedAt).toBeNull();
  });

  it("listMeta returns all annotated rows", () => {
    const ids = meta.listMeta().map((m) => m.sessionId);
    expect(ids).toEqual(expect.arrayContaining(["s-multi"]));
  });
});

describe("deleteFromDisk (the only destructive op)", () => {
  it("removes an existing .jsonl file and returns true", () => {
    const file = path.join(tmpHome, "victim.jsonl");
    fs.writeFileSync(file, "{}\n");
    expect(fs.existsSync(file)).toBe(true);
    expect(meta.deleteFromDisk(file)).toBe(true);
    expect(fs.existsSync(file)).toBe(false);
  });

  it("refuses a non-.jsonl path (guard) and leaves the file", () => {
    const file = path.join(tmpHome, "keep.txt");
    fs.writeFileSync(file, "x");
    expect(meta.deleteFromDisk(file)).toBe(false);
    expect(fs.existsSync(file)).toBe(true);
  });

  it("returns false for a missing file", () => {
    expect(meta.deleteFromDisk(path.join(tmpHome, "nope.jsonl"))).toBe(false);
  });
});
