import { useCallback, useEffect, useState } from 'react';

import {
  deriveRepoGroups,
  type RepoWorktreeGroup,
} from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/AllWorktreesPanel/allWorktreesModel';
import { useFavoriteRepos } from '@/hooks/useFavoriteRepos';
import type { RepoWorktrees } from '@/lib/types';
import { useEventsStore } from '@/store/dashboard/useEventsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

/** The live all-repos worktree groups + a refetch handle. */
export interface UseAllWorktreesResult {
  groups: RepoWorktreeGroup[];
  loading: boolean;
  refresh: () => void;
}

// The backend's `git:branch-changed` push: any repo's HEAD switch should re-pull
// the aggregation so the all-repos view stays live like the per-repo panel.
type BranchChangedEvent = { type?: string };

/**
 * Composes the all-repos (user-scope) Worktrees view: the repo SET is the user's
 * favorite/known repos (`useFavoriteRepos`); the per-repo branch list + diff/ahead
 * stats come from the batched `gitWorktreesAllRepos` IPC; STATUS + the running
 * AGENT are derived by the SAME pure `deriveRepoGroups`/`deriveWorktrees` join the
 * per-repo panel uses (cwd↔worktree match + session presence). It refetches on
 * mount, when the repo set changes, and on any `git:branch-changed` push so a
 * branch switch or a new/removed worktree in any repo is reflected without reload.
 */
export function useAllWorktrees(): UseAllWorktreesResult {
  const { repos } = useFavoriteRepos();
  const [data, setData] = useState<RepoWorktrees[]>([]);
  const [loading, setLoading] = useState(false);

  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const presence = useEventsStore((s) => s.presence);

  // Stable string key of the repo paths so the fetch effect only re-runs when the
  // actual set changes (not on every `useFavoriteRepos` object identity churn).
  const repoPaths = repos.map((r) => r.path);
  const repoKey = repoPaths.join('\n');

  const refresh = useCallback(() => {
    const paths = repoKey ? repoKey.split('\n') : [];
    if (paths.length === 0) {
      setData([]);
      return;
    }
    setLoading(true);
    void window.api
      .gitWorktreesAllRepos(paths)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [repoKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-pull on any repo's live HEAD switch (the per-repo watch broadcasts these).
  useEffect(() => {
    const off = window.api.onEvent((raw) => {
      if ((raw as BranchChangedEvent).type === 'git:branch-changed') refresh();
    });
    return off;
  }, [refresh]);

  const groups = deriveRepoGroups({ repos: data, dashboards, presence });
  return { groups, loading, refresh };
}
