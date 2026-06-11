import {
  BrowserWindow,
  ipcMain,
  Menu,
  type MenuItemConstructorOptions,
  type WebContents,
} from "electron";

import type { ContextMenuRequest, ImproveContextTarget } from "../types/improve.types";

/**
 * Self-Improve loop — native right-click context menu (I3, main half).
 *
 * The renderer's `useImproveContextMenu` hook resolves the clicked element to
 * its component context, prevents the browser's default menu, and sends a
 * `context-menu:open` request. Here we build a native Electron `Menu` with the
 * standard editing roles (copy / paste / select-all, plus toggle-devtools in
 * dev) PLUS a dev-only "Improve this…" item, and pop it at the cursor.
 *
 * Picking "Improve this…" sends `improve_context_menu_selected` back to the
 * same renderer (over the shared `push-event` channel) carrying the captured
 * target; the hook then opens the improve modal store with it.
 */

const SELECTED_EVENT = "improve_context_menu_selected";

/** Push the captured target back to the renderer that opened the menu. */
function sendSelected(sender: WebContents, target: ImproveContextTarget | null): void {
  if (sender.isDestroyed()) return;
  sender.send("push-event", { type: SELECTED_EVENT, target });
}

/** Standard editing roles every context menu offers (work on the focused element). */
const EDITING_ROLES: MenuItemConstructorOptions[] = [
  { role: "copy" },
  { role: "paste" },
  { type: "separator" },
  { role: "selectAll" },
];

function buildTemplate(
  sender: WebContents,
  { target, isDev }: ContextMenuRequest,
): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [...EDITING_ROLES];

  // The "Improve this…" item + dev tools are dev-only: the source attributes the
  // resolver depends on are stripped from production builds.
  if (isDev) {
    template.push(
      { type: "separator" },
      {
        label: "Improve this…",
        click: () => sendSelected(sender, target),
      },
      { type: "separator" },
      { role: "toggleDevTools" },
    );
  }

  return template;
}

/**
 * Register the `context-menu:open` listener. Call once at startup (after the
 * window exists). Idempotent enough for app lifetime — one listener total.
 */
export function registerContextMenu(): void {
  ipcMain.on("context-menu:open", (event, request: ContextMenuRequest) => {
    const sender = event.sender;
    const menu = Menu.buildFromTemplate(buildTemplate(sender, request));
    const win = BrowserWindow.fromWebContents(sender) ?? undefined;
    menu.popup({ window: win });
  });
}
