import { Avatar } from "@/components/_ui/Avatar";
import { Button } from "@/components/_ui/Button";
import type { FavoriteRepo } from "@/lib/types";
import { repoBasename } from "@/lib/utils";

import { repoHue } from "./utils";

type FavoriteRepoCardProps = {
  repo: FavoriteRepo;
  onOpen: (repo: FavoriteRepo) => void;
  onRemove: (repo: FavoriteRepo) => void;
};

/**
 * One favorite repo: a hued identity avatar, the repo NAME (folder basename) as
 * the bold title, the LLM description as an optional subtitle, and an
 * "Open" / "Remove" action pair. The full filesystem path is kept as a tooltip
 * on the name rather than shown as its own line. Matches the design-system home
 * RepoCard.
 */
export function FavoriteRepoCard({ repo, onOpen, onRemove }: FavoriteRepoCardProps) {
  const name = repoBasename(repo.path);
  const description = repo.label;
  return (
    <div
      data-repo-card
      className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface-1 p-4"
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={name}
          src={repo.logoDataUrl}
          hue={repoHue(repo.path)}
          shape="square"
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg" title={repo.path}>
            {name}
          </p>
          {description !== null ? (
            <p data-repo-subtitle className="truncate text-xs text-fg-subtle">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <Button intent="primary" size="sm" onClick={() => onOpen(repo)} aria-label={`Open ${name}`}>
          Open
        </Button>
        <Button intent="ghost" size="sm" onClick={() => onRemove(repo)} aria-label={`Remove ${name}`}>
          Remove
        </Button>
      </div>
    </div>
  );
}
