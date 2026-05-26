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

export type SkillMetadata = {
  author?: string;
  version?: string;
  created?: string;
  last_reviewed?: string;
  review_interval_days?: number;
  [key: string]: unknown;
};

export type SkillAnnexFile = {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
};

export type SkillFile = {
  name: string;
  description: string;
  filePath: string;
  scope: "project" | "user";
  body: string;
  lineCount: number;
  license?: string;
  metadata?: SkillMetadata;
  annexFiles: SkillAnnexFile[];
};

export type HookConfig = {
  event: string;
  matcher: string;
  command: string;
};

export type ProjectDashboard = {
  project: Project;
  agents: import("./agent.types").AgentFile[];
  skills: SkillFile[];
  hooks: HookConfig[];
};
