import { Plus, X } from 'lucide-react';

import { Flex } from '@/components/_ui/Flex';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { dashboardLabel } from './tabLabel';

export function WorkspaceBar() {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActive = useWorkspaceStore((s) => s.setActiveDashboard);
  const closeDashboard = useWorkspaceStore((s) => s.closeDashboard);
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);

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
              {dashboardLabel(d)}
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
      <Flex
        as="button"
        align="center"
        justify="center"
        onClick={() => openLauncher()}
        title="New tab"
        aria-label="New tab"
        className="w-7 h-7 rounded-md transition-colors shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Plus size={15} />
      </Flex>
    </div>
  );
}
