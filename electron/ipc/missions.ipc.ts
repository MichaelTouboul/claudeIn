import { ipcMain } from "electron";
import * as missionsService from "../services/missions.service";

export function registerMissionHandlers(): void {
  ipcMain.handle("missions:list", (_e, limit?: number, status?: string) => missionsService.getMissions(limit, status));
  ipcMain.handle("missions:get", (_e, id: number) => missionsService.getMission(id));
  ipcMain.handle("missions:events", (_e, id: number) => missionsService.getMissionEvents(id));
  ipcMain.handle("missions:create", (_e, agentName: string, title: string, sessionId?: string) =>
    missionsService.createMission(agentName, title, sessionId));
}
