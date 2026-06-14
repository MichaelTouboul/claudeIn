import { useCallback, useEffect, useState } from "react";

import type { AgentFile, HookConfig, Project, SkillFile  } from "@/lib/types";

export type { HookConfig, Project, SkillAnnexFile, SkillFile, SkillMetadata } from "@/lib/types";

export type Dashboard = {
  project: Project;
  agents: AgentFile[];
  skills: SkillFile[];
  hooks: HookConfig[];
};

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await window.api.getProjects();
    setProjects(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { projects, loading, refresh };
}
