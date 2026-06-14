import { ProjectProvider } from '@/contexts/ProjectContext';
import type { Project } from '@/lib/types';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { DashboardArea } from './DashboardArea/DashboardArea';
import { ProjectGrid } from './ProjectGrid/ProjectGrid';
import { Sidebar } from './Sidebar/Sidebar';

export type WorkspaceProps = { projects: Project[] };

export function Workspace({ projects }: WorkspaceProps) {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);

  // Empty-state grid shows ONLY when no dashboard is open. Once any dashboard
  // exists, the persistent shell (Sidebar + DashboardArea) stays mounted forever
  // so AgentChat instances never unmount — regardless of project/scope/loading.
  if (dashboards.length === 0) {
    return <ProjectGrid projects={projects} />;
  }

  // Reflect the active dashboard's project in the Sidebar when it is a project
  // scope; launcher/user scope yields null (the Sidebar renders empty but stays
  // mounted). Derived synchronously from the workspace store, so it is never
  // gated on useDashboardStore.loading.
  const active = dashboards.find((d) => d.id === activeDashboardId) ?? null;
  const activeProject: Project | null =
    active?.scope.kind === 'project' ? active.scope.project : null;

  return (
    <ProjectProvider project={activeProject}>
      <div className="flex-1 min-h-0 flex">
        <Sidebar />
        <DashboardArea />
      </div>
    </ProjectProvider>
  );
}
