// @vitest-environment node
import type { MenuItemConstructorOptions } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextMenuRequest } from "../../types/improve.types";

type OnHandler = (event: { sender: unknown }, ...args: unknown[]) => void;
const listeners = new Map<string, OnHandler>();

// Capture the template the service builds + whether popup ran.
let lastTemplate: MenuItemConstructorOptions[] = [];
const popup = vi.fn();

vi.mock("electron", () => ({
  ipcMain: {
    on: (channel: string, handler: OnHandler) => {
      listeners.set(channel, handler);
    },
  },
  Menu: {
    buildFromTemplate: (template: MenuItemConstructorOptions[]) => {
      lastTemplate = template;
      return { popup };
    },
  },
  BrowserWindow: {
    fromWebContents: () => null,
  },
}));

import { registerContextMenu } from "../system/context-menu.service";

const send = vi.fn();
function fakeEvent() {
  return { sender: { isDestroyed: () => false, send } };
}

function open(request: ContextMenuRequest) {
  const handler = listeners.get("context-menu:open");
  if (!handler) throw new Error("context-menu:open not registered");
  handler(fakeEvent(), request);
}

function findItem(label: string): MenuItemConstructorOptions | undefined {
  return lastTemplate.find((i) => i.label === label);
}

beforeEach(() => {
  listeners.clear();
  lastTemplate = [];
  popup.mockClear();
  send.mockClear();
  registerContextMenu();
});

describe("registerContextMenu — native menu template", () => {
  it("always includes the standard editing roles", () => {
    open({ target: null, isDev: true });
    const roles = lastTemplate.map((i) => i.role).filter(Boolean);
    expect(roles).toContain("copy");
    expect(roles).toContain("paste");
    expect(roles).toContain("selectAll");
    expect(popup).toHaveBeenCalledTimes(1);
  });

  it("adds the dev-only 'Improve this…' item + dev tools in dev", () => {
    open({ target: null, isDev: true });
    expect(findItem("Improve this…")).toBeDefined();
    expect(lastTemplate.some((i) => i.role === "toggleDevTools")).toBe(true);
  });

  it("omits 'Improve this…' and dev tools in a production build", () => {
    open({ target: null, isDev: false });
    expect(findItem("Improve this…")).toBeUndefined();
    expect(lastTemplate.some((i) => i.role === "toggleDevTools")).toBe(false);
    // editing roles still present
    expect(lastTemplate.some((i) => i.role === "copy")).toBe(true);
  });
});

describe("registerContextMenu — 'Improve this…' selection reply", () => {
  it("sends the resolved component target back to the renderer on click", () => {
    open({
      target: { component: "AgentChat", sourcePath: "src/components/AgentChat/AgentChat.tsx:42" },
      isDev: true,
    });
    const item = findItem("Improve this…");
    item?.click?.(
      undefined as never,
      undefined as never,
      undefined as never,
    );
    expect(send).toHaveBeenCalledWith("push-event", {
      type: "improve_context_menu_selected",
      target: { component: "AgentChat", sourcePath: "src/components/AgentChat/AgentChat.tsx:42" },
    });
  });

  it("sends target: null when nothing was annotated (general improve)", () => {
    open({ target: null, isDev: true });
    findItem("Improve this…")?.click?.(
      undefined as never,
      undefined as never,
      undefined as never,
    );
    expect(send).toHaveBeenCalledWith("push-event", {
      type: "improve_context_menu_selected",
      target: null,
    });
  });
});
