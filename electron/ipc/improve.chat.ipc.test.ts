// @vitest-environment node
import type { IpcMainInvokeEvent } from "electron";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { ImproveChatInput } from "../services/improve-chat.service";

// Capture the handlers registered via `ipcMain.handle` (electron is unavailable
// in plain node/vitest), so the test can invoke the real handler.
type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, InvokeHandler>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: InvokeHandler) => {
      handlers.set(channel, handler);
    },
  },
}));

// Mock the service boundary so the test never spawns `claude`.
const improveChatMock = vi.fn<(input: ImproveChatInput) => Promise<string>>(
  async () => "What exactly is slow?",
);
vi.mock("../services/improve-chat.service", () => ({
  improveChat: (input: ImproveChatInput) => improveChatMock(input),
}));
// The inbox service is also imported by improve.ipc; stub it to avoid disk/db.
vi.mock("../services/improve-inbox.service", () => ({
  submitRequest: vi.fn(),
  listRequests: vi.fn(),
  getRequest: vi.fn(),
  watchInbox: vi.fn(),
  unwatchInbox: vi.fn(),
}));

const { registerImproveHandlers } = await import("./improve.ipc");

const fakeEvent = {} as unknown as IpcMainInvokeEvent;

beforeAll(() => {
  registerImproveHandlers();
});

describe("improve:chat IPC", () => {
  it("registers the improve:chat handler", () => {
    expect(handlers.has("improve:chat")).toBe(true);
  });

  it("forwards the typed input to improveChat and returns the reply string", async () => {
    const input: ImproveChatInput = {
      type: "performance",
      component: "AgentChat",
      sourcePath: "src/components/AgentChat/AgentChat.tsx:1",
      transcript: [{ role: "user", text: "the chat is slow" }],
    };
    const handler = handlers.get("improve:chat");
    const result = await handler?.(fakeEvent, input);

    expect(improveChatMock).toHaveBeenCalledWith(input);
    expect(result).toBe("What exactly is slow?");
  });
});
