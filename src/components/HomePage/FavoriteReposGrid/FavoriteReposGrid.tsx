import type { FavoriteRepo } from "@/types/user.types";

import { AddRepoCard } from "./AddRepoCard";
import { FavoriteRepoCard } from "./FavoriteRepoCard";

type FavoriteReposGridProps = {
  repos: FavoriteRepo[];
  loading: boolean;
  onOpen: (repo: FavoriteRepo) => void;
  onRemove: (repo: FavoriteRepo) => void;
  onAdd: () => void;
};

/** Stacked-layout section: a grid of favorite-repo cards + the "+ ajouter" card. */
export function FavoriteReposGrid({ repos, loading, onOpen, onRemove, onAdd }: FavoriteReposGridProps) {
  return (
    <section aria-label="Dépôts favoris" className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
        Dépôts favoris
      </h2>
      {loading ? (
        <p className="text-sm text-fg-subtle">Chargement…</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
          {repos.map((repo) => (
            <FavoriteRepoCard key={repo.path} repo={repo} onOpen={onOpen} onRemove={onRemove} />
          ))}
          <AddRepoCard onAdd={onAdd} />
        </div>
      )}
    </section>
  );
}
