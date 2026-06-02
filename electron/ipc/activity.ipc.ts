import { ipcMain } from "electron";
import * as activityService from "../services/activity.service";

export function registerActivityHandlers(): void {
  ipcMain.handle("activity:get", (_e, days?: number) => activityService.getActivity(days));
}
