import type { AvatarHue } from '@/components/_ui/Avatar/Avatar';
import type { RepoWorktrees } from '@/lib/types';
import type { SessionPresence } from '@/store/dashboard/useEventsStore';
import type { Dashboard } from '@/store/useWorkspaceStore';

import {
  activeCount,
  deriveWorktrees,
  filterWorktrees,
  hueForName,
  WorktreeFilter,
  type WorktreeRow,
} from '../WorktreesPanel/worktreeModel';

/** One repo's worktree rows, grouped under a repo header for the all-repos panel. */
export interface RepoWorktreeGroup {
  /** The repo's filesystem path — stable group id + the panel's open/select key. */
  repoPath: string;
  /** Last path segment of the repo dir — the header/chip name (mono). */
  name: string;
  /** Identity hue for the repo chip, derived from the repo name (stable). */
  hue: AvatarHue;
  rows: WorktreeRow[];
  /** Enumeration error for this repo (non-git/unreadable), surfaced honestly. */
  error?: string;
}

/** Last path segment of a repo dir — the chip + header repo name. */
export function repoName(repoPath: string): string {
  const parts = repoPath.replace(/[/\\]+$/, '').split(/[/\\]/);
  return parts[parts.length - 1] || repoPath;
}

/**
 * Build the all-repos panel groups: for each repo's batched `{ branchInfo, stats }`,
 * reuse the SAME pure `deriveWorktrees` join (status + running-agent derivation from
 * the open dashboards' cwd and session presence) as the per-repo panel — no
 * duplicated per-repo logic. Pure so it is unit-testable without React.
 */
export function deriveRepoGroups(args: {
  repos: RepoWorktrees[];
  dashboards: Dashboard[];
  presence: SessionPresence;
}): RepoWorktreeGroup[] {
  return args.repos.map((repo) => ({
    repoPath: repo.repoPath,
    name: repoName(repo.repoPath),
    hue: hueForName(repoName(repo.repoPath)),
    error: repo.branchInfo.error,
    rows: deriveWorktrees({
      worktrees: repo.branchInfo.worktrees,
      current: repo.branchInfo.current,
      repoPath: repo.repoPath,
      stats: repo.stats,
      dashboards: args.dashboards,
      presence: args.presence,
    }),
  }));
}

/**
 * Apply the All/Active filter to the groups, dropping groups left with no rows
 * (the mock hides an empty repo under the Active filter). `All` keeps every group,
 * even ones with an enumeration error (so the error is still surfaced).
 */
export function filterRepoGroups(
  groups: RepoWorktreeGroup[],
  filter: WorktreeFilter,
): RepoWorktreeGroup[] {
  if (filter === WorktreeFilter.All) return groups;
  return groups
    .map((g) => ({ ...g, rows: filterWorktrees(g.rows, filter) }))
    .filter((g) => g.rows.length > 0);
}

/** Total active (non-idle) rows across every repo — the "Active · N" filter count. */
export function totalActive(groups: RepoWorktreeGroup[]): number {
  return groups.reduce((sum, g) => sum + activeCount(g.rows), 0);
}

/** Total worktree rows across every repo — the header count. */
export function totalWorktrees(groups: RepoWorktreeGroup[]): number {
  return groups.reduce((sum, g) => sum + g.rows.length, 0);
}
