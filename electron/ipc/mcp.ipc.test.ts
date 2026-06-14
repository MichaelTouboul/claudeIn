// @vitest-environment node
import type { IpcMainInvokeEvent } from "electron";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  McpAddInput,
  McpManageScope,
  McpServerRaw,
} from "../types/mcp-manage.types";

// Capture handlers registered via `ipcMain.handle` (electron is unavailable in
// plain node/vitest), so the test can invoke each real handler directly.
type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, InvokeHandler>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: InvokeHandler) => {
      handlers.set(channel, handler);
    },
  },
}));

// Read mirror service — present so registration doesn't blow up; not exercised.
vi.mock("../services/mcp/mcp.mirror", () => ({
  getMcp: vi.fn(),
  watchMcp: vi.fn(),
  unwatchMcp: vi.fn(),
}));

// Mock ONLY the manage service boundary so no real `claude` spawn runs. The
// handlers must forward their args verbatim and return the service result.
const getServerRawMock =
  vi.fn<(name: string, scope?: McpManageScope, projectPath?: string) => Promise<McpServerRaw>>();
const addServerMock = vi.fn<(input: McpAddInput) => Promise<{ ok: true } | { ok: false; error: string }>>();
const editServerMock =
  vi.fn<(name: string, input: McpAddInput) => Promise<{ ok: true } | { ok: false; error: string }>>();
const removeServerMock =
  vi.fn<(name: string, scope: McpManageScope, projectPath?: string) => Promise<{ ok: true } | { ok: false; error: string }>>();

vi.mock("../services/mcp/mcp.manage", () => ({
  getServerRaw: (name: string, scope?: McpManageScope, projectPath?: string) =>
    getServerRawMock(name, scope, projectPath),
  addServer: (input: McpAddInput) => addServerMock(input),
  editServer: (name: string, input: McpAddInput) => editServerMock(name, input),
  removeServer: (name: string, scope: McpManageScope, projectPath?: string) =>
    removeServerMock(name, scope, projectPath),
}));

const { registerMcpHandlers } = await import("./mcp.ipc");

const fakeEvent = {} as unknown as IpcMainInvokeEvent;

const rawServer: McpServerRaw = {
  name: "gh",
  transport: "http",
  scope: "user",
  url: "https://api/mcp",
  headers: { Authorization: "Bearer t" },
};

const addInput: McpAddInput = {
  name: "pw",
  scope: "local",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@playwright/mcp"],
};

beforeAll(() => {
  registerMcpHandlers();
});

beforeEach(() => {
  getServerRawMock.mockReset();
  addServerMock.mockReset();
  editServerMock.mockReset();
  removeServerMock.mockReset();
});

describe("mcp manage IPC", () => {
  it("keeps the existing read (mirror) channels registered", () => {
    expect(handlers.has("mcp:mirror:get")).toBe(true);
    expect(handlers.has("mcp:mirror:watch")).toBe(true);
    expect(handlers.has("mcp:mirror:unwatch")).toBe(true);
  });

  it("registers the four manage channels", () => {
    expect(handlers.has("mcp:get-raw")).toBe(true);
    expect(handlers.has("mcp:add")).toBe(true);
    expect(handlers.has("mcp:edit")).toBe(true);
    expect(handlers.has("mcp:remove")).toBe(true);
  });

  it("mcp:get-raw forwards (name, scope, projectPath) and returns McpServerRaw", async () => {
    getServerRawMock.mockResolvedValue(rawServer);
    const result = await handlers.get("mcp:get-raw")?.(fakeEvent, "gh", "user", "/repo");

    expect(getServerRawMock).toHaveBeenCalledWith("gh", "user", "/repo");
    expect(result).toEqual(rawServer);
  });

  it("mcp:add forwards the McpAddInput and returns the mutation result", async () => {
    addServerMock.mockResolvedValue({ ok: true });
    const result = await handlers.get("mcp:add")?.(fakeEvent, addInput);

    expect(addServerMock).toHaveBeenCalledWith(addInput);
    expect(result).toEqual({ ok: true });
  });

  it("mcp:add surfaces a CLI failure as { ok: false, error }", async () => {
    addServerMock.mockResolvedValue({ ok: false, error: "already exists" });
    const result = await handlers.get("mcp:add")?.(fakeEvent, addInput);

    expect(result).toEqual({ ok: false, error: "already exists" });
  });

  it("mcp:edit forwards (name, input) and returns the mutation result", async () => {
    editServerMock.mockResolvedValue({ ok: true });
    const result = await handlers.get("mcp:edit")?.(fakeEvent, "pw", addInput);

    expect(editServerMock).toHaveBeenCalledWith("pw", addInput);
    expect(result).toEqual({ ok: true });
  });

  it("mcp:remove forwards (name, scope, projectPath) and returns the mutation result", async () => {
    removeServerMock.mockResolvedValue({ ok: true });
    const result = await handlers.get("mcp:remove")?.(fakeEvent, "gh", "user", "/repo");

    expect(removeServerMock).toHaveBeenCalledWith("gh", "user", "/repo");
    expect(result).toEqual({ ok: true });
  });
});
