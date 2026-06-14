import { ipcMain } from "electron";
import * as memoryService from "../services/memory/memory.service";
import * as memoryMirror from "../services/memory/memory.mirror";
import * as projectService from "../services/projects/project.service";

export function registerMemoryHandlers(): void {
  // Memory mirror (additive): live CLAUDE.md hierarchy + auto-memory snapshot.
  // `memory:mirror:*` prefix avoids colliding with the existing `memory:*` CRUD.
  ipcMain.handle("memory:mirror:get", (_e, projectPath?: string) =>
    memoryMirror.getMemory(projectPath));
  ipcMain.handle("memory:mirror:watch", (_e, projectPath?: string) =>
    memoryMirror.watchMemory(projectPath));
  ipcMain.handle("memory:mirror:unwatch", () => memoryMirror.unwatchMemory());

  ipcMain.handle("memory:list", async (_e, projectId: string) => {
    const project = await projectService.getProject(projectId);
    if (!project) return [];
    return memoryService.getProjectMemory(project.path);
  });
  ipcMain.handle("memory:update", async (_e, projectId: string, fileName: string, content: string) => {
    const project = await projectService.getProject(projectId);
    if (!project) throw new Error("Project not found");
    return memoryService.updateProjectMemoryFile(project.path, fileName, content);
  });
  ipcMain.handle("memory:delete", async (_e, projectId: string, fileName: string) => {
    const project = await projectService.getProject(projectId);
    if (!project) throw new Error("Project not found");
    return memoryService.deleteProjectMemoryFile(project.path, fileName);
  });
}
