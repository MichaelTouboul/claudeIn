import { ipcMain } from "electron";
import * as mcpMirror from "../services/mcp.mirror";

export function registerMcpHandlers(): void {
  // MCP mirror (additive): static reconciliation of mcpServers across sources.
  ipcMain.handle("mcp:mirror:get", (_e, projectPath?: string) =>
    mcpMirror.getMcp(projectPath));
  ipcMain.handle("mcp:mirror:watch", (_e, projectPath?: string) =>
    mcpMirror.watchMcp(projectPath));
  ipcMain.handle("mcp:mirror:unwatch", () => mcpMirror.unwatchMcp());
}
