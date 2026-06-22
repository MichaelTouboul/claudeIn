import { useCallback, useEffect, useState } from "react";

import type { FavoriteRepo } from "@/lib/types";

export type UseFavoriteRepos = {
  repos: FavoriteRepo[];
  loading: boolean;
  /**
   * Path currently being scanned + added (null when idle). Drives the optimistic
   * pending card while `scanSingleRepo` (logo + LLM description) is in flight.
   */
  pending: string | null;
  /** Re-read the list from the back. */
  refresh: () => Promise<void>;
  /**
   * Pin a repo: scan it for a logo + one-line description (like onboarding),
   * forward both to the back, then refresh. Falls back to a bare add (no
   * label/logo) when the scan yields nothing — the add never blocks on the scan.
   */
  add: (repoPath: string) => Promise<void>;
  /** Unpin a repo by path, then refresh. */
  remove: (repoPath: string) => Promise<void>;
};

/** Read/add/remove the user's favorite repos (Home page grid). */
export function useFavoriteRepos(): UseFavoriteRepos {
  const [repos, setRepos] = useState<FavoriteRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await window.api.listFavoriteRepos();
    setRepos(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (repoPath: string) => {
      setPending(repoPath);
      try {
        const scanned = await window.api.scanSingleRepo(repoPath);
        await window.api.addFavoriteRepo(
          repoPath,
          scanned?.label ?? undefined,
          scanned?.logoDataUrl ?? undefined,
        );
        await refresh();
      } finally {
        setPending(null);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (repoPath: string) => {
      await window.api.removeFavoriteRepo(repoPath);
      await refresh();
    },
    [refresh],
  );

  return { repos, loading, pending, refresh, add, remove };
}
