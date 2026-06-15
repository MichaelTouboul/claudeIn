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

  const moveActive = (dir: 1 | -1) => {
    const i = dashboards.findIndex((d) => d.id === activeId);
    if (i === -1) return;
    const next = dashboards[(i + dir + dashboards.length) % dashboards.length];
    setActive(next.id);
  };

  return (
    <div
      role="tablist"
      className="flex items-center gap-1 px-2 py-1 shrink-0 overflow-x-auto"
      style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border)' }}
    >
      {dashboards.map((d) => {
        const isActive = d.id === activeId;
        const label = dashboardLabel(d);
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
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(d.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); moveActive(1); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); moveActive(-1); }
              }}
              className="text-sm truncate max-w-[160px] text-left cursor-pointer outline-none rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
            >
              {label}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); closeDashboard(d.id); }}
              aria-label={`Close ${label}`}
              title="Close"
              className="flex items-center justify-center w-4 h-4 rounded transition-opacity opacity-50 hover:opacity-100 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)] focus-visible:opacity-100"
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
