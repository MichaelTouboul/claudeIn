import { ipcMain } from "electron";
import * as settingsService from "../services/settings/settings.service";
import * as hooksService from "../services/settings/hooks.service";

export function registerSettingsHandlers(): void {
  ipcMain.handle("settings:get", (_e, projectPath?: string) =>
    settingsService.getSettings(projectPath));

  ipcMain.handle("settings:watch", (_e, projectPath?: string) =>
    settingsService.watchSettings(projectPath));

  ipcMain.handle("settings:unwatch", () =>
    settingsService.unwatchSettings());

  ipcMain.handle("hooks:list", (_e, projectPath?: string) =>
    hooksService.getHooks(projectPath));

  ipcMain.handle(
    "hooks:set-enabled",
    (_e, hookId: string, enabled: boolean, projectPath?: string) =>
      hooksService.setHookEnabled(hookId, enabled, projectPath),
  );
}
