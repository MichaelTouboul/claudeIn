import { ipcMain } from "electron";
import * as projectService from "../services/project.service";

export function registerProjectHandlers(): void {
  ipcMain.handle("projects:list", (_e, forceRefresh?: boolean) =>
    projectService.getProjects(forceRefresh));

  ipcMain.handle("projects:get", (_e, id: string) =>
    projectService.getProject(id));

  ipcMain.handle("projects:dashboard", async (_e, projectId: string) => {
    const project = await projectService.getProject(projectId);
    if (!project) return null;

    const [agents, skills, hooks] = await Promise.all([
      projectService.getProjectAgents(projectId),
      projectService.getProjectSkills(projectId),
      projectService.getProjectHooks(projectId),
    ]);

    let userAgents: typeof agents = [];
    let userSkills: typeof skills = [];

    if (projectId !== "user") {
      userAgents = await projectService.getProjectAgents("user");
      userSkills = await projectService.getProjectSkills("user");
    }

    return {
      project,
      agents: [
        ...agents.map((a) => ({ ...a, scope: "project" as const })),
        ...userAgents.map((a) => ({ ...a, scope: "user" as const })),
      ],
      skills: [
        ...skills,
        ...userSkills.map((s) => ({ ...s, scope: "user" as const })),
      ],
      hooks,
    };
  });
}
