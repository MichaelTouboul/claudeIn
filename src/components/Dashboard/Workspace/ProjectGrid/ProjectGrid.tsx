import { Bot } from 'lucide-react';

import { Grid } from '@/components/_ui/Grid';
import type { Project } from '@/lib/types';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export type ProjectGridProps = { projects: Project[] };

export function ProjectGrid({ projects }: ProjectGridProps) {
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-3xl mx-auto px-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--color-accent-dim)', border: '1px solid rgba(129, 140, 248, 0.15)' }}
        >
          <Bot size={24} className="text-accent" />
        </div>
        <h1 className="text-xl font-semibold mb-1.5 tracking-tight">Select a project</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {projects.length} projects detected
        </p>
        <Grid cols={3} gap={2.5}>
          {projects.slice(0, 9).map((p) => (
            <button
              key={p.id}
              onClick={() => openDashboard(p)}
              className="text-left rounded-lg p-4 transition-all duration-200 hover:translate-y-[-1px] group"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.3)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(129, 140, 248, 0.06)';
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
        </Grid>
      </div>
    </div>
  );
}
