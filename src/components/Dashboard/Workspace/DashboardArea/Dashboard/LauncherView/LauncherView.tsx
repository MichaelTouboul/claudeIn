import { Bot, FolderGit2, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { AgentSearch } from './AgentSearch/AgentSearch';
import { LauncherCard } from './LauncherCard/LauncherCard';
import { ProjectList } from './ProjectList/ProjectList';
import { WorktreeReentry } from './WorktreeReentry/WorktreeReentry';

export type LauncherViewProps = {
  dashboardId: string;
};

type Expanded = 'project' | 'agent' | null;

export function LauncherView({ dashboardId }: LauncherViewProps) {
  const resolveLauncher = useWorkspaceStore((s) => s.resolveLauncher);
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const [expanded, setExpanded] = useState<Expanded>('project');

  const openProjectIds = dashboards
    .map((d) => (d.scope.kind === 'project' ? d.scope.project.id : null))
    .filter((id): id is string => id !== null);

  const toggle = (card: Expanded) => setExpanded((prev) => (prev === card ? null : card));

  // Keyboard hints from the mock: D → new discussion, A → user-scope agent. Only
  // when no expandable card is open (so they don't steal keys from the search box).
  useEffect(() => {
    if (expanded !== null) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'd' || e.key === 'D') resolveLauncher(dashboardId, { to: 'discussion' });
      else if (e.key === 'a' || e.key === 'A') setExpanded('agent');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, dashboardId, resolveLauncher]);

  return (
    <div className="flex h-full min-h-0 flex-1 items-start justify-center overflow-y-auto p-8">
      <div className="flex w-full max-w-[560px] flex-col gap-2.5">
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          New tab
        </h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Where would you like to start?
        </p>

        <LauncherCard
          icon={<FolderGit2 size={20} />}
          hue="blue"
          title="Open a project"
          description="Chat and work inside a repository with its .claude config."
          expanded={expanded === 'project'}
          chevron
          onActivate={() => toggle('project')}
        >
          <ProjectList
            openIds={openProjectIds}
            onSelect={(project) => resolveLauncher(dashboardId, { to: 'project', project })}
          />
        </LauncherCard>

        <LauncherCard
          icon={<MessageSquare size={20} />}
          hue="green"
          title="New discussion"
          description="A project-less chat running in your home directory."
          expanded={false}
          kbd="D"
          onActivate={() => resolveLauncher(dashboardId, { to: 'discussion' })}
        />

        <LauncherCard
          icon={<Bot size={20} />}
          hue="purple"
          title="User-scope agent"
          description="Run one of your ~/.claude/agents in your home directory."
          expanded={expanded === 'agent'}
          kbd="A"
          onActivate={() => toggle('agent')}
        >
          <div className="p-3">
            <AgentSearch onSelect={(agentName) => resolveLauncher(dashboardId, { to: 'agent', agentName })} />
          </div>
        </LauncherCard>

        <WorktreeReentry />
      </div>
    </div>
  );
}
