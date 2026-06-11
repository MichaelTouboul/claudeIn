import { ipcMain } from "electron";
import * as agentService from "../services/agent.service";
import * as agentsMirror from "../services/agents.mirror";

export function registerAgentHandlers(): void {
  ipcMain.handle("agents:list", () => agentService.getAllAgents());
  ipcMain.handle("agents:get", (_e, name: string) => agentService.getAgent(name));
  ipcMain.handle("agents:get-by-path", (_e, filePath: string) => agentService.getAgentByPath(filePath));
  ipcMain.handle("agents:folders", () => agentService.getFolders());
  ipcMain.handle("agents:create", (_e, payload) => agentService.createAgent(payload));
  ipcMain.handle("agents:update", (_e, name: string, payload) => agentService.updateAgent(name, payload));
  ipcMain.handle("agents:delete", (_e, name: string) => agentService.deleteAgent(name));
  ipcMain.handle("agents:memory:update", (_e, agentName: string, fileName: string, content: string) =>
    agentService.updateMemoryFile(agentName, fileName, content));
  ipcMain.handle("agents:memory:delete", (_e, agentName: string, fileName: string) =>
    agentService.deleteMemoryFile(agentName, fileName));

  // Agents mirror (additive): live union of user + project agents.
  ipcMain.handle("agents:mirror:get", (_e, projectPath?: string) =>
    agentsMirror.getAgents(projectPath));
  ipcMain.handle("agents:mirror:watch", (_e, projectPath?: string) =>
    agentsMirror.watchAgents(projectPath));
  ipcMain.handle("agents:mirror:unwatch", () => agentsMirror.unwatchAgents());
}
