import { Bot, ChevronRight, Code2, FolderOpen, MoreHorizontal } from 'lucide-react';

import { Badge } from '@/components/_ui/Badge';
import { ContextMenu, type ContextMenuItem } from '@/components/_ui/ContextMenu';
import { IconButton } from '@/components/_ui/IconButton';
import { StatusDot } from '@/components/_ui/StatusDot';
import { Tooltip } from '@/components/_ui/Tooltip';
import { cn } from '@/lib/utils';

import type { WorktreeRow } from './worktreeModel';
import { STATUS_PRESENTATION } from './worktreePresentation';

export interface WorktreeCardAction {
  open: () => void;
  diff: () => void;
  merge: () => void;
  remove: () => void;
}

/**
 * One worktree card: color dot + branch (mono) + "current" badge + status dot/label,
 * then the running agent (hued tile) or a description, the +/− diff stats, ahead
 * commits, and the More menu. The hue is applied via the `.agent-color-<hue>`
 * class (sets `--agent-color`) so all tints reference a token, never a raw value.
 */
export function WorktreeCard({
  row,
  baseBranch,
  actions,
}: {
  row: WorktreeRow;
  baseBranch: string;
  actions: WorktreeCardAction;
}) {
  const dot = STATUS_PRESENTATION[row.status];
  const items: ContextMenuItem[] = [
    { label: 'Open', icon: <FolderOpen size={14} />, onSelect: actions.open },
    { label: 'Compare (diff)', icon: <Code2 size={14} />, onSelect: actions.diff },
    { label: `Merge into ${baseBranch}`, separatorBefore: true, onSelect: actions.merge },
    { label: 'Remove', tone: 'danger', onSelect: actions.remove },
  ];

  return (
    <div
      className={cn('group relative rounded-md', `agent-color-${row.hue}`)}
      style={{
        background: 'var(--color-surface-2)',
        border: `1px solid ${row.current ? 'var(--color-accent)' : 'var(--color-border)'}`,
      }}
    >
      {/* The More menu floats top-right as a sibling of the click button, so the
          card stays a single non-nested interactive control (a11y). */}
      <div className="absolute right-1.5 top-1.5 z-10">
        <ContextMenu
          align="end"
          items={items}
          trigger={
            <IconButton aria-label="Options" size="sm">
              <MoreHorizontal size={15} />
            </IconButton>
          }
        />
      </div>

      <button
        type="button"
        onClick={actions.open}
        className="block w-full rounded-md text-left transition-colors"
        style={{ padding: '11px 12px' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div className="flex items-center gap-2 pr-7">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--agent-color)' }} />
          <span
            className="min-w-0 flex-1 truncate text-[13px] font-medium"
            style={{
              fontFamily: 'var(--font-mono)',
              color: row.current ? 'var(--color-accent)' : 'var(--color-text-primary)',
            }}
          >
            {row.branch}
          </span>
          {row.current ? (
            <Badge variant="cyan" shape="pill">
              current
            </Badge>
          ) : null}
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <StatusDot size="xs" pulse={dot.pulse} style={{ backgroundColor: dot.color }} />
            {dot.label}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2.5">
          {row.agent ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <span
                className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm"
                style={{
                  background: 'color-mix(in srgb, var(--agent-color) 18%, var(--color-surface-2))',
                  border: '1px solid color-mix(in srgb, var(--agent-color) 30%, transparent)',
                  color: 'var(--agent-color)',
                }}
              >
                <Bot size={11} />
              </span>
              <span className="truncate">{row.agent}</span>
            </span>
          ) : (
            <span className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {row.current ? 'Current worktree' : 'No agent'}
            </span>
          )}

          <div className="flex-1" />

          {row.additions ? (
            <span className="text-xs tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-active)' }}>
              +{row.additions}
            </span>
          ) : null}
          {row.deletions ? (
            <span className="text-xs tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}>
              −{row.deletions}
            </span>
          ) : null}
          {row.ahead ? (
            <Tooltip label={`${row.ahead} commits ahead`}>
              <span
                className="inline-flex items-center gap-0.5 text-[11px] tabular-nums"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
              >
                <ChevronRight size={11} style={{ transform: 'rotate(-90deg)' }} />
                {row.ahead}
              </span>
            </Tooltip>
          ) : null}
        </div>
      </button>
    </div>
  );
}
