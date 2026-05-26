import { ipcMain } from "electron";
import * as memoryService from "../services/memory.service";
import * as projectService from "../services/project.service";

export function registerMemoryHandlers(): void {
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
