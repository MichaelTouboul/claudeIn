import { useCallback, useEffect, useState } from "react";

import type { RepoCandidate } from "@/lib/types";

export type UseReposPick = {
  repos: RepoCandidate[];
  loading: boolean;
  /** Paths the user has pinned as favorites (persisted). */
  favorites: Set<string>;
  /** Toggle a favorite: persist via add/remove then reflect locally. */
  toggle: (repoPath: string) => Promise<void>;
  /** Open the folder picker and pin the chosen dir as a favorite. */
  addFolder: () => Promise<void>;
};

/**
 * ReposPick logic: scan candidate repos on mount, seed the favorite set from the
 * persisted list, and persist every toggle / manual add immediately (so leaving
 * the step keeps the choices). A manually-added folder is appended to the list
 * if the scan didn't already surface it.
 */
export function useReposPick(): UseReposPick {
  const [repos, setRepos] = useState<RepoCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    void (async () => {
      const [scanned, pinned] = await Promise.all([
        window.api.scanRepos(),
        window.api.listFavoriteRepos(),
      ]);
      if (!active) return;
      setRepos(scanned);
      setFavorites(new Set(pinned.map((repo) => repo.path)));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback(
    async (repoPath: string) => {
      const pinned = favorites.has(repoPath);
      if (pinned) await window.api.removeFavoriteRepo(repoPath);
      else await window.api.addFavoriteRepo(repoPath);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (pinned) next.delete(repoPath);
        else next.add(repoPath);
        return next;
      });
    },
    [favorites],
  );

  const addFolder = useCallback(async () => {
    const dir = await window.api.openDirectoryPicker();
    if (dir === null) return;
    await window.api.addFavoriteRepo(dir);
    setRepos((prev) =>
      prev.some((repo) => repo.path === dir)
        ? prev
        : [
            ...prev,
            { path: dir, scope: "project", hasClaude: true, plugins: [], label: null, logoDataUrl: null },
          ],
    );
    setFavorites((prev) => new Set(prev).add(dir));
  }, []);

  return { repos, loading, favorites, toggle, addFolder };
}
