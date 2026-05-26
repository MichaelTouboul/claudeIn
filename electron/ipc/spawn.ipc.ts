import { ipcMain } from "electron";
import * as spawnService from "../services/spawn.service";

export function registerSpawnHandlers(): void {
  ipcMain.handle("spawn:list", () => spawnService.getAllSessions());
  ipcMain.handle("spawn:active", () => spawnService.getActiveSessions());
  ipcMain.handle("spawn:start", (_e, opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string }) =>
    spawnService.spawnAgent(opts.agent_name || "_main", opts.mission, opts.cwd, opts.resume_session_id));
  ipcMain.handle("spawn:get", (_e, sessionId: string) => spawnService.getSession(sessionId));
  ipcMain.handle("spawn:input", (_e, sessionId: string, text: string) => spawnService.sendInput(sessionId, text));
  ipcMain.handle("spawn:kill", (_e, sessionId: string) => spawnService.killSession(sessionId));
}
