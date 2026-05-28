import { useState, useEffect, useCallback } from "react";

import type { AgentFile } from "@/types/agent.types";

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

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await window.api.getProjects();
    setProjects(data as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { projects, loading, refresh };
}

export type Dashboard = {
  project: Project;
  agents: AgentFile[];
  skills: SkillFile[];
  hooks: HookConfig[];
};

export function useDashboard(projectId: string | null) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const data = await window.api.getDashboard(projectId);
    setDashboard(data as Dashboard);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { dashboard, loading, refresh };
}
