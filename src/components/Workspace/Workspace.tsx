import { Bot } from 'lucide-react';

import { ProjectProvider } from '@/store/ProjectContext';
import { useAppStore } from '@/store/useAppStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { Project } from '@/types/dashboard.types';

import { DashboardArea } from './DashboardArea/DashboardArea';
import { Sidebar } from './Sidebar/Sidebar';

export type WorkspaceProps = { projects: Project[] };

export function Workspace({ projects }: WorkspaceProps) {
  const selectedProject = useAppStore((s) => s.selectedProject);
  const project = useDashboardStore((s) => s.project);
  const loading = useDashboardStore((s) => s.loading);
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);

  if (!selectedProject) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-3xl mx-auto px-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--color-accent-dim)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
            <Bot size={24} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold mb-1.5 tracking-tight">Select a project</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{projects.length} projects detected</p>
          <div className="grid grid-cols-3 gap-2.5">
            {projects.slice(0, 9).map((p) => (
              <button
                key={p.id}
                onClick={() => openDashboard(p)}
                className="text-left rounded-lg p-4 transition-all duration-200 hover:translate-y-[-1px] group"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(6, 182, 212, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="text-[13px] font-medium mb-1 truncate group-hover:text-accent transition-colors">{p.name}</div>
                <div className="text-[11px] truncate mb-2.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{p.path}</div>
                <div className="flex gap-3 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {p.agentCount > 0 ? <span className="font-mono tabular-nums">{p.agentCount} <span style={{ color: 'var(--color-text-muted)' }}>agents</span></span> : null}
                  {p.skillCount > 0 ? <span className="font-mono tabular-nums">{p.skillCount} <span style={{ color: 'var(--color-text-muted)' }}>skills</span></span> : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading || !project) {
    return <div className="flex-1 flex items-center justify-center text-fg-muted">Loading dashboard...</div>;
  }

  return (
    <ProjectProvider project={project}>
      <div className="flex-1 min-h-0 flex">
        <Sidebar />
        <DashboardArea />
      </div>
    </ProjectProvider>
  );
}
