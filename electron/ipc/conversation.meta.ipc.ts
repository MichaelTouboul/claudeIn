import { ipcMain } from "electron";
import * as meta from "../services/conversation.meta";

// App-owned conversation annotations (pin/archive/soft-delete). RAM/DB only —
// never touches ~/.claude. All annotations are reversible; there is no
// destructive on-disk delete by design.
export function registerConversationMetaHandlers(): void {
  ipcMain.handle("conversation:pin", (_e, sessionId: string) => meta.pin(sessionId));
  ipcMain.handle("conversation:unpin", (_e, sessionId: string) => meta.unpin(sessionId));
  ipcMain.handle("conversation:archive", (_e, sessionId: string) => meta.archive(sessionId));
  ipcMain.handle("conversation:unarchive", (_e, sessionId: string) => meta.unarchive(sessionId));
  ipcMain.handle("conversation:softDelete", (_e, sessionId: string) => meta.softDelete(sessionId));
  ipcMain.handle("conversation:restore", (_e, sessionId: string) => meta.restore(sessionId));
  ipcMain.handle("conversation:set-title", (_e, sessionId: string, title: string) => meta.setUserTitle(sessionId, title));
}
