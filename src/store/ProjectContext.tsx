import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { Project } from "@/lib/types";

import { useDashboardStore } from "./useDashboardStore";

type ProjectContextValue = {
  project: Project | null;
  projectId: string | null;
  projectName: string | null;
  projectPath: string | null;
  isUserProject: boolean;
  refresh: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ project, children }: { project: Project | null; children: ReactNode }) {
  const refresh = useDashboardStore((s) => s.refresh);
  const value = useMemo<ProjectContextValue>(
    () => ({
      project,
      projectId: project?.id ?? null,
      projectName: project ? project.name || project.id : null,
      projectPath: project?.path ?? null,
      isUserProject: project?.id === "user",
      refresh,
    }),
    [project, refresh]
  );
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
