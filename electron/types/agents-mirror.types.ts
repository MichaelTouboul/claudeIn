import type { AgentFrontmatter } from "./agent.types";

export const AgentScope = { User: "user", Project: "project", Plugin: "plugin" } as const;
export type AgentScope = (typeof AgentScope)[keyof typeof AgentScope];

export interface AgentSummary {
  id: string; // frontmatter.name
  scope: AgentScope;
  filePath: string;
  relativePath: string;
  folder: string; // '' for top-level
  frontmatter: AgentFrontmatter; // parsed; lightweight (no body/memory/annex)
  subAgents: string[];
  shadowed: boolean; // true when a project agent of the same name overrides it
  /** The owning plugin pack name for `scope: Plugin` agents; null otherwise. */
  source: string | null;
}

export interface AgentsSnapshot {
  projectPath: string | null;
  agents: AgentSummary[]; // union of user + project, shadowing resolved/marked
}
