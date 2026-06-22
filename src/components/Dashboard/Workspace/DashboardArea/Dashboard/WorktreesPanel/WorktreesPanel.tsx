import { Activity, FolderGit2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { IconButton } from '@/components/_ui/IconButton';
import { SegmentedControl } from '@/components/_ui/SegmentedControl';
import { Tooltip } from '@/components/_ui/Tooltip';
import { useWorktrees } from '@/hooks/useWorktrees';

import { NewWorktreeDialog } from './NewWorktreeDialog';
import { useWorktreeActions } from './useWorktreeActions';
import { WorktreeCard } from './WorktreeCard';
import { WorktreeConfirmDialog } from './WorktreeConfirmDialog';
import { activeCount, filterWorktrees, WorktreeFilter, type WorktreeRow } from './worktreeModel';
import { FILTER_OPTIONS } from './worktreePresentation';

/** Last path segment of a repo dir — the chip + header repo name (mono). */
function repoName(repoPath: string): string {
  const parts = repoPath.replace(/[/\\]+$/, '').split(/[/\\]/);
  return parts[parts.length - 1] || repoPath;
}

/**
 * The Worktrees panel — a card panel scoped to the ACTIVE repo. Header (repo chip
 * + name + "{N} worktrees · {M} actifs" + new-worktree button), a Tous/Actifs/Au
 * repos filter, the live worktree cards, and a "scope : {repo}" footer. All data
 * is real: list via `useGitBranches` (live), diff/ahead stats via
 * `gitWorktreeStats`, status+agent derived from session presence. Mutations run
 * real git ops behind confirms (see `useWorktreeActions`).
 */
export function WorktreesPanel({ repoPath }: { repoPath: string }) {
  const { rows, branchInfo, refreshStats } = useWorktrees(repoPath);
  const [filter, setFilter] = useState<WorktreeFilter>(WorktreeFilter.All);
  const [newOpen, setNewOpen] = useState(false);

  const actions = useWorktreeActions(repoPath, refreshStats);
  const name = repoName(repoPath);
  const baseBranch = rows.find((r) => r.ahead === 0 && !r.current)?.branch ?? '_main';

  const visible = useMemo(() => filterWorktrees(rows, filter), [rows, filter]);
  const active = activeCount(rows);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header
        name={name}
        total={rows.length}
        active={active}
        onNew={() => setNewOpen(true)}
        error={branchInfo?.error}
      />

      <div
        className="flex shrink-0 items-center px-3 py-2.5"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} size="sm" className="w-full" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {visible.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {branchInfo?.error ? branchInfo.error : 'Aucun worktree'}
          </p>
        ) : (
          visible.map((row) => (
            <WorktreeCard
              key={row.path}
              row={row}
              baseBranch={baseBranch}
              actions={actions.cardActions(row)}
            />
          ))
        )}
      </div>

      <Footer name={name} active={active} />

      <NewWorktreeDialog open={newOpen} onOpenChange={setNewOpen} onCreate={actions.create} />
      {actions.confirm ? (
        <WorktreeConfirmDialog
          open
          onOpenChange={(o) => {
            if (!o) actions.closeConfirm();
          }}
          title={actions.confirm.title}
          body={actions.confirm.body}
          confirmLabel={actions.confirm.confirmLabel}
          danger={actions.confirm.danger}
          onConfirm={actions.confirm.run}
        />
      ) : null}
    </div>
  );
}

function Header({
  name,
  total,
  active,
  onNew,
  error,
}: {
  name: string;
  total: number;
  active: number;
  onNew: () => void;
  error?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 px-3.5 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <span
        className="agent-color-blue inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-sm"
        style={{
          background: 'color-mix(in srgb, var(--agent-color) 18%, var(--color-surface-2))',
          border: '1px solid color-mix(in srgb, var(--agent-color) 30%, transparent)',
          color: 'var(--agent-color)',
        }}
      >
        <FolderGit2 size={13} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
          {name}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {error ? error : `${total} worktrees · ${active} actifs`}
        </span>
      </div>
      <Tooltip label="Nouveau worktree">
        <IconButton aria-label="Nouveau worktree" size="sm" onClick={onNew}>
          <Plus size={16} />
        </IconButton>
      </Tooltip>
    </div>
  );
}

function Footer({ name, active }: { name: string; active: number }) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 px-3.5 py-2.5"
      style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-0)' }}
    >
      <span className="text-[11.5px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
        scope : {name}
      </span>
      <div className="flex-1" />
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-accent)' }}>
        <Activity size={13} /> {active} actifs
      </span>
    </div>
  );
}

export type { WorktreeRow };
