import type { FavoriteRepo } from "@/lib/types";

import { AddRepoCard } from "./AddRepoCard";
import { FavoriteRepoCard } from "./FavoriteRepoCard";

type FavoriteReposGridProps = {
  repos: FavoriteRepo[];
  loading: boolean;
  onOpen: (repo: FavoriteRepo) => void;
  onRemove: (repo: FavoriteRepo) => void;
  onAdd: () => void;
};

/** Stacked-layout section: a grid of favorite-repo cards + the "+ add" card. */
export function FavoriteReposGrid({ repos, loading, onOpen, onRemove, onAdd }: FavoriteReposGridProps) {
  return (
    <section aria-label="Favorite repositories" className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
        Favorite repositories
      </h2>
      {loading ? (
        <p className="text-sm text-fg-subtle" aria-busy="true">
          Loading…
        </p>
      ) : (
        <>
          {repos.length === 0 ? (
            <p className="text-sm text-fg-subtle">
              No favorite repositories yet. Add one to find it here.
            </p>
          ) : null}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
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
