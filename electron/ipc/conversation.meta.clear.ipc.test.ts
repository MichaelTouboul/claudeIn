// @vitest-environment node
import type { IpcMainInvokeEvent } from "electron";
import { beforeAll, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// db.ts reads HOME at module load to compute the DB path, so set it before any
// dynamic import that transitively loads it.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-clear-ipc-"));
process.env.HOME = tmpHome;

// The handler module imports `ipcMain` from "electron", which is unavailable in
// a plain node/vitest process. Mock ONLY that boundary: capture each handler
// callback registered via `ipcMain.handle` so the test can invoke the real
// `conversation:clear` handler the same way the main process would. Everything
// the handler touches (conversation.meta, db, session.service) stays real.
type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, InvokeHandler>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: InvokeHandler) => {
      handlers.set(channel, handler);
    },
  },
}));

const { initDb } = await import("../services/db");
const meta = await import("../services/conversation.meta");
const { loadConversation } = await import("../services/session.service");
const { registerConversationMetaHandlers } = await import("./conversation.meta.ipc");

// Stand-in for the Electron-provided event; the handler ignores it (`_e`), so a
// minimal object cast through `unknown` is faithful to the real call shape.
const fakeEvent = {} as unknown as IpcMainInvokeEvent;

const projectPath = "/tmp/proj-clear-ipc";
const sessionsDir = path.join(tmpHome, ".claude", "projects", projectPath.replace(/\//g, "-"));

function writeTranscript(
  claudeSessionId: string,
  msgs: { role: "user" | "assistant"; text: string; ts: string }[],
): string {
  fs.mkdirSync(sessionsDir, { recursive: true });
  const lines = msgs.map((m, i) =>
    m.role === "user"
      ? JSON.stringify({ type: "user", promptId: `p${i}`, uuid: `u${i}`, message: { content: m.text }, timestamp: m.ts })
      : JSON.stringify({ type: "assistant", uuid: `a${i}`, message: { model: "m", content: [{ type: "text", text: m.text }] }, timestamp: m.ts }),
  );
  // loadConversation derives the session id from the file basename, so the
  // transcript file must be named after the claudeSessionId we clear.
  const fp = path.join(sessionsDir, `${claudeSessionId}.jsonl`);
  fs.writeFileSync(fp, lines.join("\n") + "\n");
  return fp;
}

beforeAll(async () => {
  await initDb();
  registerConversationMetaHandlers();
});

describe("conversation:clear IPC roundtrip (renderer dispatch -> handler -> persisted boundary)", () => {
  it("registers the conversation:clear handler", () => {
    expect(handlers.has("conversation:clear")).toBe(true);
  });

  it("invoking the handler persists cleared_at for the session via the real meta + db", async () => {
    const claudeSessionId = "clear-ipc-persists";
    expect(meta.getMeta(claudeSessionId)?.clearedAt ?? null).toBeNull();

    const handler = handlers.get("conversation:clear");
    expect(handler).toBeDefined();
    await handler?.(fakeEvent, claudeSessionId);

    // Observable behavior: the durable boundary now exists in the real DB.
    expect(meta.getMeta(claudeSessionId)?.clearedAt).toBeTruthy();
  });

  it("a subsequent loadConversation returns empty once the boundary is set through the handler", async () => {
    const claudeSessionId = "clear-ipc-empties";
    const fp = writeTranscript(claudeSessionId, [
      { role: "user", text: "before-clear-q", ts: "2026-01-01T00:00:00.000Z" },
      { role: "assistant", text: "before-clear-a", ts: "2026-01-01T00:00:01.000Z" },
    ]);

    // Before clearing, the full transcript loads.
    const before = await loadConversation(fp);
    expect(before.messages.map((m) => m.content)).toEqual(["before-clear-q", "before-clear-a"]);

    // Drive the clear exactly as the renderer would: through the IPC handler.
    const handler = handlers.get("conversation:clear");
    await handler?.(fakeEvent, claudeSessionId);

    // The handler set the boundary to "now" (after every message), so the
    // conversation reads as empty while the transcript file is left intact.
    const after = await loadConversation(fp);
    expect(after.messages).toEqual([]);
    expect(fs.existsSync(fp)).toBe(true);
  });
});
