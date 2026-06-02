import type { AgentFile } from "../types/agent.types";
import type { SkillFile } from "../types/dashboard.types";

export const api = {
  getAgents: (): Promise<AgentFile[]> => window.api.getAgents(),
  getAgent: (name: string): Promise<AgentFile | null> => window.api.getAgent(name),
  getSkill: (filePath: string): Promise<SkillFile | null> => window.api.getSkill(filePath),
  getFolders: (): Promise<string[]> => window.api.getFolders(),

  createAgent: (payload: {
    folder: string;
    fileName: string;
    frontmatter: Record<string, unknown>;
    body: string;
  }): Promise<AgentFile> => window.api.createAgent(payload),

  updateAgent: (name: string, payload: { frontmatter?: Record<string, unknown>; body?: string }): Promise<AgentFile> =>
    window.api.updateAgent(name, payload),

  deleteAgent: (name: string): Promise<void> => window.api.deleteAgent(name),

  updateMemoryFile: (agentName: string, fileName: string, content: string) =>
    window.api.updateMemoryFile(agentName, fileName, content),

  deleteMemoryFile: (agentName: string, fileName: string): Promise<void> =>
    window.api.deleteMemoryFile(agentName, fileName),

  getProjectMemory: (projectId: string) => window.api.getProjectMemory(projectId),
  updateProjectMemoryFile: (projectId: string, fileName: string, content: string) =>
    window.api.updateProjectMemoryFile(projectId, fileName, content),
  deleteProjectMemoryFile: (projectId: string, fileName: string): Promise<void> =>
    window.api.deleteProjectMemoryFile(projectId, fileName),
};
