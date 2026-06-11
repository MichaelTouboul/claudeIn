import { ipcMain } from "electron";
import * as systemService from "../services/system.service";

export function registerSystemHandlers(): void {
  ipcMain.handle("system:home-dir", () => systemService.getHomeDir());
  ipcMain.handle("system:appVersion", () => systemService.getAppVersion());
}
