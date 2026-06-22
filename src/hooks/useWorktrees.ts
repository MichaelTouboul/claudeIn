import { useCallback, useEffect, useState } from 'react';

import { deriveWorktrees, type WorktreeRow } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/WorktreesPanel/worktreeModel';
import type { GitBranchInfo, WorktreeStat } from '@/lib/types';
import { useEventsStore } from '@/store/dashboard/useEventsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { useGitBranches } from './useGitBranches';

/** The live worktree rows for a repo + a refetch handle for the diff/ahead stats. */
export interface UseWorktreesResult {
  rows: WorktreeRow[];
  branchInfo: GitBranchInfo | null;
  /** Re-fetch the per-worktree diff/ahead stats (after a mutation or on demand). */
  refreshStats: () => void;
  loading: boolean;
}

/**
 * Composes the Worktrees panel's live data: the worktree LIST + current branch
 * come from `useGitBranches` (live via the `git:branch-changed` push); the diff/
 * ahead STATS come from `gitWorktreeStats` (fetched on mount, on every branch
 * change, and on demand after a mutation); STATUS + the running AGENT are derived
 * by matching each worktree's path to the open dashboards' cwd and reading session
 * presence from the events store. The heavy join is the pure `deriveWorktrees`.
 */
export function useWorktrees(repoPath: string | undefined): UseWorktreesResult {
  const branchInfo = useGitBranches(repoPath);
  const [stats, setStats] = useState<WorktreeStat[]>([]);
  const [loading, setLoading] = useState(false);

  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const presence = useEventsStore((s) => s.presence);

  const refreshStats = useCallback(() => {
    if (!repoPath) {
      setStats([]);
      return;
    }
    setLoading(true);
    void window.api
      .gitWorktreeStats(repoPath)
      .then(setStats)
      .catch(() => setStats([]))
      .finally(() => setLoading(false));
  }, [repoPath]);

  // Refetch stats on mount, on path change, and whenever the live branch/worktree
  // state changes. `branchInfo` is a fresh object on every `git:branch-changed`
  // push (useGitBranches calls setInfo with new data), so a branch switch or a
  // new/removed worktree — which shifts the diff base — re-runs this effect.
  useEffect(() => {
    refreshStats();
  }, [refreshStats, branchInfo]);

  const rows = deriveWorktrees({
    worktrees: branchInfo?.worktrees ?? [],
    current: branchInfo?.current ?? null,
    stats,
    dashboards,
    presence,
  });

  return { rows, branchInfo, refreshStats, loading };
}
