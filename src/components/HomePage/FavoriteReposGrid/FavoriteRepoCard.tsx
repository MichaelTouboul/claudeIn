import { Button } from "@/components/_ui/Button";
import { Inline } from "@/components/_ui/Inline";
import type { FavoriteRepo } from "@/lib/types";

import { repoLabel } from "../openFavorite";

type FavoriteRepoCardProps = {
  repo: FavoriteRepo;
  onOpen: (repo: FavoriteRepo) => void;
  onRemove: (repo: FavoriteRepo) => void;
};

/** One favorite repo: a label + path, an "Open" action and a discreet "Remove". */
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
      <Inline gap={2}>
        <Button intent="primary" size="sm" onClick={() => onOpen(repo)} aria-label={`Open ${label}`}>
          Open
        </Button>
        <Button intent="ghost" size="sm" onClick={() => onRemove(repo)} aria-label={`Remove ${label}`}>
          Remove
        </Button>
      </Inline>
    </div>
  );
}
