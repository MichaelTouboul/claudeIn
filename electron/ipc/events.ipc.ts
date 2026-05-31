import { ipcMain } from "electron";
import * as eventsService from "../services/events.service";

export function registerEventHandlers(): void {
  ipcMain.handle("events:recent", (_e, limit?: number) => eventsService.getRecentEvents(limit));
  ipcMain.handle("events:by-agent", (_e, agentName: string, limit?: number) => eventsService.getEventsByAgent(agentName, limit));
  ipcMain.handle("events:stats", () => eventsService.getStats());
  ipcMain.handle("events:ingest", (_e, event) => eventsService.ingestEvent(event));
}
