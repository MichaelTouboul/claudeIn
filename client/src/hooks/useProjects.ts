import { useState, useEffect, useCallback } from "react";

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

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/projects").then((r) => r.json());
    setProjects(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { projects, loading, refresh };
}

export function useDashboard(projectId: string | null) {
  const [dashboard, setDashboard] = useState<{
    project: Project;
    agents: any[];
    skills: SkillFile[];
    hooks: HookConfig[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const data = await fetch(`/api/projects/${projectId}/dashboard`).then((r) => r.json());
    setDashboard(data);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { dashboard, loading, refresh };
}
