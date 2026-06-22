import { Boxes } from 'lucide-react';
import { useMemo, useState } from 'react';

import { SegmentedControl, type SegmentedOption } from '@/components/_ui/SegmentedControl';
import { useAllWorktrees } from '@/hooks/useAllWorktrees';

import { WorktreeConfirmDialog } from '../WorktreesPanel/WorktreeConfirmDialog';
import { WorktreeFilter } from '../WorktreesPanel/worktreeModel';
import { filterRepoGroups, totalActive, totalWorktrees } from './allWorktreesModel';
import { RepoGroup } from './RepoGroup';
import { useAllWorktreeActions } from './useAllWorktreeActions';

/** All / Active filter options (the all-repos panel has no Idle-only filter). */
const ALL_FILTER_OPTIONS: SegmentedOption<WorktreeFilter>[] = [
  { value: WorktreeFilter.All, label: 'All' },
  { value: WorktreeFilter.Active, label: 'Active' },
];

/**
 * The all-repos (user-scope) Worktrees panel: every active worktree across the
 * user's known repositories, grouped by repo. Header (boxes icon + "Worktrees ·
 * all repos" + total), an All/Active filter, then a sticky repo header per repo
 * with its worktree cards. All data is REAL — repos from `useFavoriteRepos`, the
 * batched per-repo branch/stat aggregation via `gitWorktreesAllRepos`, status +
 * running agent derived by the SAME pure join as the per-repo panel. Open/Compare/
 * Delete run the same real git ops behind a confirm.
 */
export function AllWorktreesPanel() {
  const { groups, refresh } = useAllWorktrees();
  const [filter, setFilter] = useState<WorktreeFilter>(WorktreeFilter.All);
  const actions = useAllWorktreeActions(refresh);

  const active = totalActive(groups);
  const total = totalWorktrees(groups);
  const visible = useMemo(() => filterRepoGroups(groups, filter), [groups, filter]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex shrink-0 items-center gap-2.5 px-3.5 py-3"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <span className="inline-flex" style={{ color: 'var(--color-accent)' }}>
          <Boxes size={17} />
        </span>
        <span className="flex-1 text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Worktrees · all repos
        </span>
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {total} wt
        </span>
      </div>

      <div className="flex shrink-0 items-center px-3 py-2.5" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <SegmentedControl
          options={[
            ALL_FILTER_OPTIONS[0],
            { value: WorktreeFilter.Active, label: `Active · ${active}` },
          ]}
          value={filter}
          onChange={setFilter}
          size="sm"
          className="w-full"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2.5 pt-1">
        {visible.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {groups.length === 0 ? 'Aucun repo favori' : 'Aucun worktree'}
          </p>
        ) : (
          visible.map((group) => (
            <RepoGroup key={group.repoPath} group={group} cardActions={actions.cardActions} />
          ))
        )}
      </div>

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
