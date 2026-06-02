import { ipcMain } from "electron";
import * as settingsService from "../services/settings.service";

export function registerSettingsHandlers(): void {
  ipcMain.handle("settings:get", (_e, projectPath?: string) =>
    settingsService.getSettings(projectPath));

  ipcMain.handle("settings:watch", (_e, projectPath?: string) =>
    settingsService.watchSettings(projectPath));

  ipcMain.handle("settings:unwatch", () =>
    settingsService.unwatchSettings());
}
