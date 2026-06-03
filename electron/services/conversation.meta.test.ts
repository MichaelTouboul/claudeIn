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
    expect(cols).toEqual(expect.arrayContaining(["session_id", "pinned_at", "archived_at", "deleted_at", "note"]));
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
