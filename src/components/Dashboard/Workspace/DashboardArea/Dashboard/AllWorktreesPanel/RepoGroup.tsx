import type { WorktreeCardActions } from '../WorktreesPanel/worktreeActions';
import { WorktreeCard } from '../WorktreesPanel/WorktreeCard';
import type { WorktreeRow } from '../WorktreesPanel/worktreeModel';
import type { RepoWorktreeGroup } from './allWorktreesModel';
import { RepoChip } from './RepoChip';

/** The default-base branch of a group (a non-current, zero-ahead row), for the merge label. */
function baseBranchOf(rows: WorktreeRow[]): string {
  return rows.find((r) => r.ahead === 0 && !r.current)?.branch ?? '_main';
}

/**
 * One repository section of the all-repos panel: a sticky repo header (chip + mono
 * name + "{N} wt") followed by its worktree cards. Each card reuses the SAME
 * `WorktreeCard` as the per-repo panel; actions are bound to THIS group's repo path
 * by the parent. An enumeration error for the repo is surfaced in place of cards.
 */
export function RepoGroup({
  group,
  cardActions,
}: {
  group: RepoWorktreeGroup;
  cardActions: (repoPath: string, row: WorktreeRow) => WorktreeCardActions;
}) {
  const baseBranch = baseBranchOf(group.rows);
  return (
    <div>
      <div
        className="sticky top-0 z-[1] flex items-center gap-2.5 px-2 pb-2 pt-3"
        style={{ background: 'var(--color-surface-1)' }}
      >
        <RepoChip hue={group.hue} />
        <span
          className="min-w-0 flex-1 truncate text-[13px] font-semibold"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}
        >
          {group.name}
        </span>
        <span className="shrink-0 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {group.error ? group.error : `${group.rows.length} wt`}
        </span>
      </div>

      {group.error ? null : (
        <div className="flex flex-col gap-1.5 pl-[31px]">
          {group.rows.map((row) => (
            <WorktreeCard
              key={row.path}
              row={row}
              baseBranch={baseBranch}
              actions={cardActions(group.repoPath, row)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
