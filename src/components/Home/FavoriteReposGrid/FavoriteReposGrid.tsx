import type { FavoriteRepo } from "@/lib/types";

import { AddRepoCard } from "./AddRepoCard";
import { FavoriteRepoCard } from "./FavoriteRepoCard";

type FavoriteReposGridProps = {
  /** Repos to render (already filtered by the active search query). */
  repos: FavoriteRepo[];
  /** Total favorites before filtering — shown in the section count. */
  total: number;
  loading: boolean;
  /** True when a search query is active but matched nothing. */
  filteredEmpty: boolean;
  onOpen: (repo: FavoriteRepo) => void;
  onRemove: (repo: FavoriteRepo) => void;
  onAdd: () => void;
};

/**
 * "Favorite repositories" section: an overline + a mono repo count, then a grid
 * of repo cards followed by the add-repository card. Mirrors the design-system
 * home layout.
 */
export function FavoriteReposGrid({
  repos,
  total,
  loading,
  filteredEmpty,
  onOpen,
  onRemove,
  onAdd,
}: FavoriteReposGridProps) {
  return (
    <section aria-label="Favorite repositories">
      <div className="mb-3.5 flex items-baseline justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Favorite repositories
        </span>
        <span className="whitespace-nowrap text-xs text-fg-subtle font-mono">{total} repos</span>
      </div>
      {loading ? (
        <p className="text-sm text-fg-subtle" aria-busy="true">
          Loading…
        </p>
      ) : (
        <>
          {filteredEmpty ? (
            <p className="mb-3 text-sm text-fg-subtle">No repositories match your search.</p>
          ) : null}
          {total === 0 ? (
            <p className="mb-3 text-sm text-fg-subtle">
              No favorite repositories yet. Add one to find it here.
            </p>
          ) : null}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] gap-4">
            {repos.map((repo) => (
              <FavoriteRepoCard key={repo.path} repo={repo} onOpen={onOpen} onRemove={onRemove} />
            ))}
            <AddRepoCard onAdd={onAdd} />
          </div>
        </>
      )}
    </section>
  );
}
