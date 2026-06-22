import { Bot, Boxes } from 'lucide-react';

import { StatusDot } from '@/components/_ui/StatusDot';
import { RepoChip } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/AllWorktreesPanel/RepoChip';
import { openWorktree } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/WorktreesPanel/worktreeActions';
import { STATUS_PRESENTATION } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/WorktreesPanel/worktreePresentation';
import { useAllWorktrees } from '@/hooks/useAllWorktrees';

import { flattenActiveWorktrees } from './reentryModel';

/**
 * The "Active worktrees · all repos" section of the new tab: every NON-idle
 * worktree across the user's repos, surfaced as a quick re-entry point (`repo /
 * branch`, running agent + status). All data is real (via `useAllWorktrees`).
 * Activating a row opens that worktree (the same `openWorktree` the panels use:
 * focus its open dashboard, else its diff). Renders nothing when none are active.
 */
export function WorktreeReentry() {
  const { groups } = useAllWorktrees();
  const items = flattenActiveWorktrees(groups);
  if (items.length === 0) return null;

  return (
    <div className="mt-2">
      <div
        className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <Boxes size={14} /> Active worktrees · all repos
      </div>

      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const dot = STATUS_PRESENTATION[item.row.status];
          return (
            <button
              key={`${item.repoPath}::${item.row.path}`}
              type="button"
              onClick={() => openWorktree(item.row)}
              className="flex items-center gap-2.5 rounded-md p-2.5 text-left transition-colors"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface-1)')}
            >
              <RepoChip hue={item.repoHue} size={22} icon={13} />
              <span className={`agent-color-${item.row.hue} min-w-0 flex-1`}>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="max-w-[140px] shrink truncate text-[11.5px]"
                    style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    {item.repoName}
                  </span>
                  <span className="shrink-0" style={{ color: 'var(--color-border-strong)' }}>
                    /
                  </span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: 'var(--agent-color)' }}
                  />
                  <span
                    className="truncate text-[13px] font-medium"
                    style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
                  >
                    {item.row.branch}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {item.row.agent ? (
                    <>
                      <Bot size={11} />
                      {item.row.agent}
                      <span style={{ color: dot.color }}>· {dot.label}</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>{dot.label}</span>
                  )}
                </span>
              </span>
              <StatusDot pulse={dot.pulse} style={{ backgroundColor: dot.color }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
