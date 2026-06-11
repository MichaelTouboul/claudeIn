import { ipcMain } from "electron";

import {
  getRequest,
  listRequests,
  submitRequest,
  unwatchInbox,
  watchInbox,
} from "../services/improve-inbox.service";
import type { ImproveRequestInput } from "../types/improve.types";

/**
 * Self-Improve inbox IPC. Thin adapters delegating to `improve-inbox.service`
 * (filesystem-backed; the `<id>.json` files are the source of truth). Channels
 * follow `domain:action`:
 *   improve:submit  → submitRequest(input) → ImproveRequest
 *   improve:list    → listRequests()       → ImproveRequest[] (newest first)
 *   improve:get     → getRequest(id)       → ImproveRequest | null
 *   improve:watch   → watchInbox()         → void (push `improve_request_changed`)
 *   improve:unwatch → unwatchInbox()       → void
 */
export function registerImproveHandlers(): void {
  ipcMain.handle("improve:submit", (_e, input: ImproveRequestInput) => submitRequest(input));
  ipcMain.handle("improve:list", () => listRequests());
  ipcMain.handle("improve:get", (_e, id: string) => getRequest(id));
  ipcMain.handle("improve:watch", () => watchInbox());
  ipcMain.handle("improve:unwatch", () => {
    unwatchInbox();
  });
}
