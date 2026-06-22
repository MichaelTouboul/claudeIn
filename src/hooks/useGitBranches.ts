import { useEffect, useState } from 'react';

import type { GitBranchInfo } from '@/lib/types';

/**
 * Read the current branch + worktree list for a repo path (read-only). Fetches
 * `window.api.gitBranches(repoPath)` whenever the path changes; returns null
 * until a path is known or the first fetch resolves. Stale resolutions from a
 * superseded path are dropped via a cancel guard.
 */
export function useGitBranches(repoPath: string | undefined): GitBranchInfo | null {
  const [info, setInfo] = useState<GitBranchInfo | null>(null);

  useEffect(() => {
    if (!repoPath) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    void window.api
      .gitBranches(repoPath)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [repoPath]);

  return info;
}
