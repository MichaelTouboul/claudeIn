import { useCallback, useEffect, useState } from "react";

import type { FavoriteRepo } from "@/lib/types";

export type UseFavoriteRepos = {
  repos: FavoriteRepo[];
  loading: boolean;
  /** Re-read the list from the back. */
  refresh: () => Promise<void>;
  /** Pin a repo (optional label), then refresh. */
  add: (repoPath: string, label?: string) => Promise<void>;
  /** Unpin a repo by path, then refresh. */
  remove: (repoPath: string) => Promise<void>;
};

/** Read/add/remove the user's favorite repos (Home page grid). */
export function useFavoriteRepos(): UseFavoriteRepos {
  const [repos, setRepos] = useState<FavoriteRepo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await window.api.listFavoriteRepos();
    setRepos(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (repoPath: string, label?: string) => {
      await window.api.addFavoriteRepo(repoPath, label);
      await refresh();
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

  return { repos, loading, refresh, add, remove };
}
