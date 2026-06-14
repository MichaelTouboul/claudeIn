// @vitest-environment node
import type { IpcMainInvokeEvent } from "electron";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { TransformInput } from "../services/transform/transform.prompt";

// Capture the handler registered via `ipcMain.handle` (electron is unavailable
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

// Mock ONLY the service boundary so the test never spawns `claude`. We assert the
// handler forwards its typed input verbatim and returns the service's result.
const transformMock = vi.fn<(input: TransformInput) => Promise<string>>(
  async () => "| a |\n|---|\n| 1 |",
);
vi.mock("../services/transform/transform.service", () => ({
  transform: (input: TransformInput) => transformMock(input),
}));

const { registerTransformHandlers } = await import("./transform.ipc");

const fakeEvent = {} as unknown as IpcMainInvokeEvent;

beforeAll(() => {
  registerTransformHandlers();
});

describe("panel:transform IPC", () => {
  it("registers the panel:transform handler", () => {
    expect(handlers.has("panel:transform")).toBe(true);
  });

  it("forwards the typed input to the transform service and returns its result", async () => {
    const input: TransformInput = {
      kind: "table",
      instruction: "add a total column",
      content: "| a |\n|---|\n| 1 |",
    };
    const handler = handlers.get("panel:transform");
    const result = await handler?.(fakeEvent, input);

    expect(transformMock).toHaveBeenCalledWith(input);
    expect(result).toBe("| a |\n|---|\n| 1 |");
  });
});
