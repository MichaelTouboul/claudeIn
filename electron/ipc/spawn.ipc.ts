import { ipcMain } from "electron";
import * as spawnService from "../services/spawn.service";

export function registerSpawnHandlers(): void {
  ipcMain.handle("spawn:list", () => spawnService.getAllSessions());
  ipcMain.handle("spawn:start",(_e, opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string; model?: string }) =>
    spawnService.spawnAgent(opts.agent_name || "_main", opts.mission, opts.cwd, opts.resume_session_id, opts.model));
  ipcMain.handle("spawn:get", (_e, localSessionId: string) => spawnService.getSession(localSessionId));
  ipcMain.handle("spawn:input", (_e, localSessionId: string, text: string) => spawnService.sendInput(localSessionId, text));
  ipcMain.handle("spawn:kill", (_e, localSessionId: string) => spawnService.killSession(localSessionId));
}
