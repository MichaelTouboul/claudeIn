import { ipcMain } from "electron";
import * as costsService from "../services/costs.service";

export function registerCostHandlers(): void {
  ipcMain.handle("costs:summary", () => costsService.getCostsSummary());
  ipcMain.handle("costs:by-day", (_e, days?: number) => costsService.getCostsByDay(days));
  ipcMain.handle("costs:by-agent", (_e, days?: number) => costsService.getCostsByAgent(days));
  ipcMain.handle("costs:by-agent-day", (_e, days?: number) => costsService.getCostsByAgentPerDay(days));
  ipcMain.handle("costs:by-tool", (_e, days?: number) => costsService.getCostsByTool(days));
}
