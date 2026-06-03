// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Mock broadcast before importing the service so the spy is in place.
vi.mock("./broadcast", () => ({ broadcast: vi.fn() }));

import { broadcast } from "./broadcast";
import { unwatchConversation, watchConversation } from "./conversation.tail";
import type { SessionMessage } from "../types/session.types";

const broadcastMock = vi.mocked(broadcast);

let tmpDir: string;
let filePath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-tail-"));
  filePath = path.join(tmpDir, "session-abc.jsonl");
  broadcastMock.mockClear();
});

afterEach(() => {
  unwatchConversation(filePath); // always tear down the watcher/timer
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** macOS fs.watch can take a beat to arm — settle before mutating. */
function settle(ms = 150): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitFor(predicate: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = (): void => {
      if (predicate()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error("timeout"));
      setTimeout(tick, 20);
    };
    tick();
  });
}

interface AppendedPush {
  type?: string;
  filePath?: string;
  messages?: SessionMessage[];
}

function appendedPushes(): AppendedPush[] {
  return broadcastMock.mock.calls
    .map(([d]) => d as AppendedPush)
    .filter((d) => d.type === "conversation_appended" && d.filePath === filePath);
}

function allMessages(): SessionMessage[] {
  return appendedPushes().flatMap((p) => p.messages ?? []);
}

function userLine(content: string): string {
  return JSON.stringify({
    type: "user",
    promptId: "p1",
    uuid: `u-${content}`,
    timestamp: "2026-06-02T00:00:00Z",
    message: { content },
  });
}

function assistantTextLine(text: string): string {
  return JSON.stringify({
    type: "assistant",
    uuid: `a-${text}`,
    timestamp: "2026-06-02T00:00:01Z",
    message: {
      model: "claude-opus-4",
      content: [{ type: "text", text }],
      usage: { input_tokens: 10, output_tokens: 20 },
    },
  });
}

function append(line: string): void {
  fs.appendFileSync(filePath, line + "\n");
}

describe("conversation.tail watchConversation", () => {
  it("broadcasts a delta with only the newly appended messages", async () => {
    fs.writeFileSync(filePath, userLine("seed") + "\n");
    watchConversation(filePath);
    await settle();

    append(assistantTextLine("hello there"));
    await waitFor(() => allMessages().some((m) => m.content === "hello there"));

    const msgs = allMessages();
    // Seed line existed before watch → must NOT appear in any delta.
    expect(msgs.some((m) => m.content === "seed")).toBe(false);
    const assistant = msgs.find((m) => m.content === "hello there");
    expect(assistant?.role).toBe("assistant");
    expect(assistant?.model).toBe("claude-opus-4");
    expect(assistant?.tokensOut).toBe(20);
  });

  it("emits a newer delta on a second append, not the first again", async () => {
    fs.writeFileSync(filePath, "");
    watchConversation(filePath);
    await settle();

    append(assistantTextLine("first"));
    await waitFor(() => allMessages().some((m) => m.content === "first"));

    append(assistantTextLine("second"));
    await waitFor(() => allMessages().some((m) => m.content === "second"));

    const contents = allMessages().map((m) => m.content);
    expect(contents.filter((c) => c === "first")).toHaveLength(1);
    expect(contents.filter((c) => c === "second")).toHaveLength(1);
  });

  it("buffers a partial trailing line and emits one message once completed", async () => {
    fs.writeFileSync(filePath, "");
    watchConversation(filePath);
    await settle();

    const full = assistantTextLine("partial then full");
    const half = full.slice(0, 20);
    // Write an incomplete line (no newline) — must not emit yet.
    fs.appendFileSync(filePath, half);
    await settle(200);
    expect(allMessages().some((m) => m.content === "partial then full")).toBe(false);

    // Complete the line.
    fs.appendFileSync(filePath, full.slice(20) + "\n");
    await waitFor(() => allMessages().some((m) => m.content === "partial then full"));
    expect(
      allMessages().filter((m) => m.content === "partial then full"),
    ).toHaveLength(1);
  });

  it("resets the cursor and re-emits when the file is truncated/rewritten", async () => {
    // Seed with several lines so the cursor advances well past a later, shorter file.
    fs.writeFileSync(
      filePath,
      assistantTextLine("original one") +
        "\n" +
        assistantTextLine("original two") +
        "\n" +
        assistantTextLine("original three") +
        "\n",
    );
    watchConversation(filePath);
    await settle();

    // Rewrite the file SMALLER than the cursor (one short line) → size < offset
    // triggers the truncation reset and a re-read from the start.
    fs.writeFileSync(filePath, assistantTextLine("new") + "\n");
    await waitFor(() => allMessages().some((m) => m.content === "new"));
    expect(allMessages().some((m) => m.content === "new")).toBe(true);
  });

  it("stops broadcasting after unwatchConversation", async () => {
    fs.writeFileSync(filePath, "");
    watchConversation(filePath);
    await settle();

    append(assistantTextLine("before unwatch"));
    await waitFor(() => allMessages().some((m) => m.content === "before unwatch"));

    unwatchConversation(filePath);
    const countBefore = allMessages().length;

    append(assistantTextLine("after unwatch"));
    await new Promise((r) => setTimeout(r, 400)); // past the debounce window

    expect(allMessages().length).toBe(countBefore);
    expect(allMessages().some((m) => m.content === "after unwatch")).toBe(false);
  });
});
