import { Button } from "@/components/_ui/Button";
import type { FavoriteRepo } from "@/types/user.types";

import { repoLabel } from "../openFavorite";

type FavoriteRepoCardProps = {
  repo: FavoriteRepo;
  onOpen: (repo: FavoriteRepo) => void;
  onRemove: (repo: FavoriteRepo) => void;
};

/** One favorite repo: a label + path, an "open" action and a discreet "remove". */
export function FavoriteRepoCard({ repo, onOpen, onRemove }: FavoriteRepoCardProps) {
  const label = repoLabel(repo);
  return (
    <div
      data-repo-card
      className="flex flex-col gap-3 rounded border border-border bg-surface-1 p-4"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg" style={{ fontFamily: "var(--font-sans)" }}>
          {label}
        </p>
        <p className="truncate text-xs text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }} title={repo.path}>
          {repo.path}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button intent="primary" size="sm" onClick={() => onOpen(repo)} aria-label={`Ouvrir ${label}`}>
          Ouvrir
        </Button>
        <Button intent="ghost" size="sm" onClick={() => onRemove(repo)} aria-label={`Retirer ${label}`}>
          Retirer
        </Button>
      </div>
    </div>
  );
}
