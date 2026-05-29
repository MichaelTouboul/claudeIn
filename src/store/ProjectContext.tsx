import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { Project } from "@/types/dashboard.types";

import { useDashboardStore } from "./useDashboardStore";

type ProjectContextValue = {
  project: Project;
  projectId: string;
  projectName: string;
  projectPath: string;
  isUserProject: boolean;
  refresh: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ project, children }: { project: Project; children: ReactNode }) {
  const refresh = useDashboardStore((s) => s.refresh);
  const value = useMemo<ProjectContextValue>(
    () => ({
      project,
      projectId: project.id,
      projectName: project.name || project.id,
      projectPath: project.path,
      isUserProject: project.id === "user",
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
