export type Project = {
  id: string;
  name: string;
  path: string;
  claudeDir: string;
  hasAgents: boolean;
  hasSkills: boolean;
  hasSettings: boolean;
  agentCount: number;
  skillCount: number;
};

export type SkillFile = {
  name: string;
  description: string;
  filePath: string;
  scope: "project" | "user";
};

export type HookConfig = {
  event: string;
  matcher: string;
  command: string;
};

export type ProjectDashboard = {
  project: Project;
  agents: import("./agent.types.js").AgentFile[];
  skills: SkillFile[];
  hooks: HookConfig[];
};
