import { useEffect, useState } from 'react';

import type { GitBranchInfo } from '@/lib/types';

// The backend's `git:branch-changed` push payload (broadcast by git.watch.ts on
// each HEAD switch), narrowed in the onEvent handler below.
type BranchChangedEvent = {
  type?: string;
  repoPath?: string;
  info?: GitBranchInfo;
};

/**
 * The current branch + worktree list for a repo path, kept LIVE. On a path change
 * it fetches `window.api.gitBranches(repoPath)` once for the initial value AND
 * starts a backend HEAD watch (`watchGitBranch`); thereafter every branch switch —
 * by the user (external `git checkout`) or by Claude (a session that switches/
 * creates a worktree mid-run) — arrives as a `git:branch-changed` push event and
 * updates the state with no refetch and no reopening of the conversation. Stale
 * resolutions from a superseded path are dropped via a cancel guard; the watch is
 * torn down on path change/unmount.
 */
export function useGitBranches(repoPath: string | undefined): GitBranchInfo | null {
  const [info, setInfo] = useState<GitBranchInfo | null>(null);

  useEffect(() => {
    if (!repoPath) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    // Capture the api surface for this effect run so cleanup doesn't depend on
    // `window.api` still being the same object at teardown.
    const api = window.api;

    void api
      .gitBranches(repoPath)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      });

    // Start the live HEAD watch and react to its broadcasts for THIS repo only.
    void api.watchGitBranch(repoPath);
    const off = api.onEvent((raw) => {
      const data = raw as BranchChangedEvent;
      if (data.type !== 'git:branch-changed' || data.repoPath !== repoPath || !data.info) return;
      if (!cancelled) setInfo(data.info);
    });

    return () => {
      cancelled = true;
      off();
      void api.unwatchGitBranch(repoPath);
    };
  }, [repoPath]);

  return info;
}
