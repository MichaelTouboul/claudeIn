import { ipcMain } from "electron";
import * as sessionService from "../services/session/session.service";
import { unwatchConversation, watchConversation } from "../services/conversation/conversation.tail";

export function registerSessionHandlers(): void {
  ipcMain.handle("sessions:list", (_e, projectPath: string) =>
    sessionService.listSessions(projectPath));

  ipcMain.handle("sessions:conversation", (_e, filePath: string) =>
    sessionService.loadConversation(filePath));

  ipcMain.handle("sessions:watch-start", (_e, projectPath: string) =>
    sessionService.startWatching(projectPath));

  ipcMain.handle("sessions:watch-stop", (_e, projectPath: string) =>
    sessionService.stopWatching(projectPath));

  // Live-tail a single open conversation by filePath (delta-only appends).
  ipcMain.handle("conversation:watch", (_e, filePath: string) =>
    watchConversation(filePath));

  ipcMain.handle("conversation:unwatch", (_e, filePath: string) =>
    unwatchConversation(filePath));
}
