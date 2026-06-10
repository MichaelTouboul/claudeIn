import { ipcMain } from "electron";

import * as mcpManage from "../services/mcp.manage";
import * as mcpMirror from "../services/mcp.mirror";
import type { McpAddInput, McpManageScope } from "../types/mcp-manage.types";

export function registerMcpHandlers(): void {
  // MCP mirror (read): static reconciliation of mcpServers across sources.
  ipcMain.handle("mcp:mirror:get", (_e, projectPath?: string) =>
    mcpMirror.getMcp(projectPath));
  ipcMain.handle("mcp:mirror:watch", (_e, projectPath?: string) =>
    mcpMirror.watchMcp(projectPath));
  ipcMain.handle("mcp:mirror:unwatch", () => mcpMirror.unwatchMcp());

  // MCP manage (additive): add / remove / edit / view-raw via the `claude mcp`
  // CLI. Thin adapters — each forwards verbatim to `mcp.manage` and returns its
  // contract shape (McpServerRaw or the { ok } McpMutationResult union).
  ipcMain.handle(
    "mcp:get-raw",
    (_e, name: string, scope?: McpManageScope, projectPath?: string) =>
      mcpManage.getServerRaw(name, scope, projectPath));
  ipcMain.handle("mcp:add", (_e, input: McpAddInput) => mcpManage.addServer(input));
  ipcMain.handle("mcp:edit", (_e, name: string, input: McpAddInput) =>
    mcpManage.editServer(name, input));
  ipcMain.handle(
    "mcp:remove",
    (_e, name: string, scope: McpManageScope, projectPath?: string) =>
      mcpManage.removeServer(name, scope, projectPath));
}
