// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// db.ts reads HOME at module load to compute the DB path, so set it before the
// dynamic imports below.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-convclear-"));
process.env.HOME = tmpHome;

const { initDb } = await import("./db");
const meta = await import("./conversation.meta");
const { loadConversation } = await import("./session.service");

beforeAll(async () => {
  await initDb();
});

describe("cleared-boundary persistence", () => {
  it("records and round-trips clearedAt through getMeta", () => {
    expect(meta.getMeta("s-clear")?.clearedAt ?? null).toBeNull();
    meta.clearConversation("s-clear");
    expect(meta.getMeta("s-clear")?.clearedAt).toBeTruthy();
  });

  it("clears the boundary again (undo) when set to null", () => {
    meta.clearConversation("s-clear-undo");
    expect(meta.getMeta("s-clear-undo")?.clearedAt).toBeTruthy();
    meta.unclearConversation("s-clear-undo");
    expect(meta.getMeta("s-clear-undo")?.clearedAt).toBeNull();
  });
});

describe("loadConversation honors the cleared boundary", () => {
  const projectPath = "/tmp/proj-clear";
  const sessionsDir = path.join(tmpHome, ".claude", "projects", projectPath.replace(/\//g, "-"));

  function writeTranscript(sessionId: string, msgs: { role: "user" | "assistant"; text: string; ts: string }[]): string {
    fs.mkdirSync(sessionsDir, { recursive: true });
    const lines = msgs.map((m, i) =>
      m.role === "user"
        ? JSON.stringify({ type: "user", promptId: `p${i}`, uuid: `u${i}`, message: { content: m.text }, timestamp: m.ts })
        : JSON.stringify({ type: "assistant", uuid: `a${i}`, message: { model: "m", content: [{ type: "text", text: m.text }] }, timestamp: m.ts }),
    );
    const fp = path.join(sessionsDir, `${sessionId}.jsonl`);
    fs.writeFileSync(fp, lines.join("\n") + "\n");
    return fp;
  }

  it("returns ALL messages when no boundary is set", async () => {
    const fp = writeTranscript("conv-nobound", [
      { role: "user", text: "first", ts: "2026-01-01T00:00:00.000Z" },
      { role: "assistant", text: "reply", ts: "2026-01-01T00:00:01.000Z" },
    ]);
    const conv = await loadConversation(fp);
    expect(conv.messages.map((m) => m.content)).toEqual(["first", "reply"]);
  });

  it("drops messages at or before the boundary, keeps later ones", async () => {
    const fp = writeTranscript("conv-bound", [
      { role: "user", text: "old-q", ts: "2026-01-01T00:00:00.000Z" },
      { role: "assistant", text: "old-a", ts: "2026-01-01T00:00:01.000Z" },
      { role: "user", text: "new-q", ts: "2026-01-01T00:00:09.000Z" },
      { role: "assistant", text: "new-a", ts: "2026-01-01T00:00:10.000Z" },
    ]);
    meta.setClearedAt("conv-bound", "2026-01-01T00:00:05.000Z");
    const conv = await loadConversation(fp);
    expect(conv.messages.map((m) => m.content)).toEqual(["new-q", "new-a"]);
  });

  it("returns empty when the boundary is after every message (fresh conversation)", async () => {
    const fp = writeTranscript("conv-allcleared", [
      { role: "user", text: "q", ts: "2026-01-01T00:00:00.000Z" },
      { role: "assistant", text: "a", ts: "2026-01-01T00:00:01.000Z" },
    ]);
    meta.clearConversation("conv-allcleared"); // clearedAt = now (after 2026-01-01)
    const conv = await loadConversation(fp);
    expect(conv.messages).toEqual([]);
    // The transcript file is NOT deleted by clearing.
    expect(fs.existsSync(fp)).toBe(true);
  });
});
