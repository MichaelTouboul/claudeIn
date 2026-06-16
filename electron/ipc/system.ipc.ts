import { ipcMain } from "electron";
import * as systemService from "../services/system/system.service";
import { unwatchAppVersion, watchAppVersion } from "../services/system/version.watch";

export function registerSystemHandlers(): void {
  ipcMain.handle("system:home-dir", () => systemService.getHomeDir());
  ipcMain.handle("system:open-path", (_e, target: string) => systemService.openPath(target));
  ipcMain.handle("system:appVersion", () => systemService.getAppVersion());
  ipcMain.handle("system:watch-version", () => watchAppVersion());
  ipcMain.handle("system:unwatch-version", () => unwatchAppVersion());
}
