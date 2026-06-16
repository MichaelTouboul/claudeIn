import { useCallback, useEffect, useState } from "react";

import type { RepoCandidate } from "@/lib/types";

export type UseReposPick = {
  repos: RepoCandidate[];
  loading: boolean;
  /** Paths the user has pinned as favorites (persisted). */
  favorites: Set<string>;
  /** Toggle a favorite: persist via add/remove then reflect locally. */
  toggle: (repoPath: string) => Promise<void>;
  /** Pin every repo in `paths` not already favorited (persisting each). */
  pinAll: (paths: string[]) => Promise<void>;
  /** Unpin every repo in `paths` currently favorited (persisting each). */
  clearAll: (paths: string[]) => Promise<void>;
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
      if (pinned) {
        await window.api.removeFavoriteRepo(repoPath);
      } else {
        // Persist the scan-time label + detected logo so the favorite keeps both
        // across reloads (the renderer can't re-detect a logo — it has no FS).
        const repo = repos.find((r) => r.path === repoPath);
        await window.api.addFavoriteRepo(repoPath, repo?.label ?? undefined, repo?.logoDataUrl ?? null);
      }
      setFavorites((prev) => {
        const next = new Set(prev);
        if (pinned) next.delete(repoPath);
        else next.add(repoPath);
        return next;
      });
    },
    [favorites, repos],
  );

  const pinAll = useCallback(
    async (paths: string[]) => {
      const toAdd = paths.filter((p) => !favorites.has(p));
      await Promise.all(
        toAdd.map((p) => {
          const repo = repos.find((r) => r.path === p);
          return window.api.addFavoriteRepo(p, repo?.label ?? undefined, repo?.logoDataUrl ?? null);
        }),
      );
      setFavorites((prev) => {
        const next = new Set(prev);
        toAdd.forEach((p) => next.add(p));
        return next;
      });
    },
    [favorites, repos],
  );

  const clearAll = useCallback(
    async (paths: string[]) => {
      const toRemove = paths.filter((p) => favorites.has(p));
      await Promise.all(toRemove.map((p) => window.api.removeFavoriteRepo(p)));
      setFavorites((prev) => {
        const next = new Set(prev);
        toRemove.forEach((p) => next.delete(p));
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

  return { repos, loading, favorites, toggle, pinAll, clearAll, addFolder };
}
