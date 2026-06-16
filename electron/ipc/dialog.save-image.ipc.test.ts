// @vitest-environment node
import type { IpcMainInvokeEvent } from "electron";
import fs from "fs";
import { beforeAll, describe, expect, it, vi } from "vitest";

type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, InvokeHandler>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: InvokeHandler) => {
      handlers.set(channel, handler);
    },
  },
  dialog: {},
  BrowserWindow: { getFocusedWindow: () => null },
}));

const { registerDialogHandlers } = await import("./dialog.ipc");

const fakeEvent = {} as unknown as IpcMainInvokeEvent;

beforeAll(() => {
  registerDialogHandlers();
});

describe("dialog:save-image IPC", () => {
  it("registers the handler", () => {
    expect(handlers.has("dialog:save-image")).toBe(true);
  });

  it("persists a base64 PNG data URL to a real file and returns its path", async () => {
    const handler = handlers.get("dialog:save-image")!;
    const png = Buffer.from("hello-png").toString("base64");
    const path = (await handler(fakeEvent, `data:image/png;base64,${png}`)) as string | null;

    expect(path).toMatch(/\.png$/);
    expect(path).not.toBeNull();
    expect(fs.existsSync(path!)).toBe(true);
    expect(fs.readFileSync(path!).toString()).toBe("hello-png");
  });

  it("returns null for a non-image / malformed data URL", async () => {
    const handler = handlers.get("dialog:save-image")!;
    expect(await handler(fakeEvent, "not-a-data-url")).toBeNull();
    expect(await handler(fakeEvent, "data:text/plain;base64,AAAA")).toBeNull();
  });
});
