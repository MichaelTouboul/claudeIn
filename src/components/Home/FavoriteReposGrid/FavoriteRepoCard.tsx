import { Avatar } from "@/components/_ui/Avatar";
import { Button } from "@/components/_ui/Button";
import type { FavoriteRepo } from "@/lib/types";
import { repoLabel } from "@/lib/utils";

import { repoHue } from "./utils";

type FavoriteRepoCardProps = {
  repo: FavoriteRepo;
  onOpen: (repo: FavoriteRepo) => void;
  onRemove: (repo: FavoriteRepo) => void;
};

/**
 * One favorite repo: a hued identity avatar, the label + mono path, and an
 * "Open" / "Remove" action pair. Matches the design-system home RepoCard.
 */
export function FavoriteRepoCard({ repo, onOpen, onRemove }: FavoriteRepoCardProps) {
  const label = repoLabel(repo);
  return (
    <div
      data-repo-card
      className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface-1 p-4"
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={label}
          src={repo.logoDataUrl}
          hue={repoHue(repo.path)}
          shape="square"
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{label}</p>
          <p className="truncate text-xs text-fg-subtle font-mono" title={repo.path}>
            {repo.path}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button intent="primary" size="sm" onClick={() => onOpen(repo)} aria-label={`Open ${label}`}>
          Open
        </Button>
        <Button intent="ghost" size="sm" onClick={() => onRemove(repo)} aria-label={`Remove ${label}`}>
          Remove
        </Button>
      </div>
    </div>
  );
}
