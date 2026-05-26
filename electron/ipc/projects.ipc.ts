import { ipcMain } from "electron";
import * as projectService from "../services/project.service";
import * as linksService from "../services/links.service";

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

    let linkedAgentNames: string[] = [];
    let userAgents: typeof agents = [];
    let userSkills: typeof skills = [];

    if (projectId !== "user") {
      linkedAgentNames = linksService.getLinksForProject(projectId);
      userAgents = await projectService.getProjectAgents("user");
      userSkills = await projectService.getProjectSkills("user");
    }

    const linkedSet = new Set(linkedAgentNames);
    const taggedUserAgents = userAgents.map((a) => ({
      ...a,
      scope: "user" as const,
      linked: linkedSet.has(a.id),
    }));

    return {
      project,
      agents: [
        ...agents.map((a) => ({ ...a, scope: "project" as const, linked: true })),
        ...taggedUserAgents,
      ],
      skills: [
        ...skills,
        ...userSkills.map((s) => ({ ...s, scope: "user" as const })),
      ],
      hooks,
    };
  });

  ipcMain.handle("links:list", (_e, projectId: string) =>
    linksService.getLinksForProject(projectId));

  ipcMain.handle("links:add", async (_e, agentName: string, projectId: string) => {
    const userAgents = await projectService.getProjectAgents("user");
    const agent = userAgents.find((a) => a.id === agentName);
    linksService.linkAgent(agentName, projectId);
    if (agent && agent.subAgents.length > 0) {
      const existingIds = new Set(userAgents.map((a) => a.id));
      for (const sub of agent.subAgents) {
        if (existingIds.has(sub)) linksService.linkAgent(sub, projectId);
      }
    }
  });

  ipcMain.handle("links:remove", async (_e, agentName: string, projectId: string) => {
    const userAgents = await projectService.getProjectAgents("user");
    const agent = userAgents.find((a) => a.id === agentName);
    linksService.unlinkAgent(agentName, projectId);
    if (agent && agent.subAgents.length > 0) {
      for (const sub of agent.subAgents) {
        linksService.unlinkAgent(sub, projectId);
      }
    }
  });
}
