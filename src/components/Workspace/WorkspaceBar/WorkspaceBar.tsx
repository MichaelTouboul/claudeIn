import { X } from 'lucide-react';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { ProjectPicker } from '../ProjectPicker/ProjectPicker';

export function WorkspaceBar() {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActive = useWorkspaceStore((s) => s.setActiveDashboard);
  const closeDashboard = useWorkspaceStore((s) => s.closeDashboard);
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);

  if (dashboards.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 shrink-0 overflow-x-auto"
      style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border)' }}
    >
      {dashboards.map((d) => {
        const isActive = d.id === activeId;
        return (
          <div
            key={d.id}
            className="group flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-t-md transition-colors shrink-0"
            style={{
              background: isActive ? 'var(--color-surface-2)' : 'transparent',
              borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
            }}
          >
            <button
              onClick={() => setActive(d.id)}
              className="text-xs truncate max-w-[160px] text-left cursor-pointer"
              style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {d.project.name}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); closeDashboard(d.id); }}
              title="Close"
              className="flex items-center justify-center w-4 h-4 rounded transition-opacity opacity-50 hover:opacity-100"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
      <ProjectPicker onSelect={openDashboard} openIds={dashboards.map((d) => d.project.id)} />
    </div>
  );
}
