import { useState } from 'react';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { AgentSearch } from './AgentSearch/AgentSearch';
import { LauncherCard } from './LauncherCard/LauncherCard';
import { ProjectList } from './ProjectList/ProjectList';

export type LauncherViewProps = {
  dashboardId: string;
};

type Expanded = 'project' | 'agent' | null;

export function LauncherView({ dashboardId }: LauncherViewProps) {
  const resolveLauncher = useWorkspaceStore((s) => s.resolveLauncher);
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const [expanded, setExpanded] = useState<Expanded>(null);

  const openProjectIds = dashboards
    .map((d) => (d.scope.kind === 'project' ? d.scope.project.id : null))
    .filter((id): id is string => id !== null);

  const toggle = (card: Expanded) => setExpanded((prev) => (prev === card ? null : card));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto h-full flex items-start justify-center p-8">
      <div className="w-full max-w-md flex flex-col gap-3">
        <h2
          className="text-xs uppercase tracking-wider mb-1"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          New tab
        </h2>

        <LauncherCard
          icon="📁"
          title="Open a project"
          description="Chat and work inside a repository with its .claude config."
          expanded={expanded === 'project'}
          onActivate={() => toggle('project')}
        >
          <ProjectList
            openIds={openProjectIds}
            onSelect={(project) => resolveLauncher(dashboardId, { to: 'project', project })}
          />
        </LauncherCard>

        <LauncherCard
          icon="💬"
          title="New discussion"
          description="A project-less chat running in your home directory."
          expanded={false}
          onActivate={() => resolveLauncher(dashboardId, { to: 'discussion' })}
        />

        <LauncherCard
          icon="🤖"
          title="User-scope agent"
          description="Run one of your ~/.claude/agents in your home directory."
          expanded={expanded === 'agent'}
          onActivate={() => toggle('agent')}
        >
          <AgentSearch onSelect={(agentName) => resolveLauncher(dashboardId, { to: 'agent', agentName })} />
        </LauncherCard>
      </div>
    </div>
  );
}
