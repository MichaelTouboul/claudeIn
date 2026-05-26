import { ipcMain } from "electron";
import * as sessionService from "../services/session.service";

export function registerSessionHandlers(): void {
  ipcMain.handle("sessions:list", (_e, projectPath: string) =>
    sessionService.listSessions(projectPath));

  ipcMain.handle("sessions:conversation", (_e, filePath: string) =>
    sessionService.loadConversation(filePath));

  ipcMain.handle("sessions:watch-start", (_e, projectPath: string) =>
    sessionService.startWatching(projectPath));

  ipcMain.handle("sessions:watch-stop", (_e, projectPath: string) =>
    sessionService.stopWatching(projectPath));
}
