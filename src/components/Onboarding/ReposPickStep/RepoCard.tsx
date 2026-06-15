import { Badge } from "@/components/_ui/Badge";
import { Inline } from "@/components/_ui/Inline";
import { Stack } from "@/components/_ui/Stack";
import type { RepoCandidate } from "@/lib/types";
import { repoBasename } from "@/lib/utils";

import { avatarLetter, avatarVariant } from "./repoAvatar";

type RepoCardProps = {
  repo: RepoCandidate;
  checked: boolean;
  onToggle: (repoPath: string) => void;
};

/** The repo logo image, or a deterministic colored letter avatar fallback. */
function RepoAvatar({ name, logoDataUrl }: { name: string; logoDataUrl: string | null }) {
  if (logoDataUrl !== null) {
    return (
      <img
        src={logoDataUrl}
        alt={`${name} logo`}
        className="h-9 w-9 shrink-0 rounded object-cover"
        style={{ background: "var(--color-surface-3)" }}
      />
    );
  }
  return (
    <Badge
      variant={avatarVariant(name)}
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center !px-0 text-sm font-semibold"
    >
      {avatarLetter(name)}
    </Badge>
  );
}

/**
 * One scanned repo as a card: a detected logo (or a deterministic colored letter
 * avatar fallback), the repo name, a truncated label/description, and the
 * favorite toggle. The whole card is a `<label>` so clicking it flips the
 * checkbox (preserving the row toggle behavior).
 */
export function RepoCard({ repo, checked, onToggle }: RepoCardProps) {
  const name = repoBasename(repo.path);
  return (
    <label
      className="flex cursor-pointer items-center gap-3 rounded border border-border bg-surface-2 p-3"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(repo.path)}
        className="shrink-0 accent-[var(--color-accent)]"
        aria-label={`Favorite ${name}`}
      />
      <RepoAvatar name={name} logoDataUrl={repo.logoDataUrl} />
      <Stack gap={0.5} className="min-w-0">
        <span className="truncate text-sm font-medium text-fg">{name}</span>
        <Inline gap={1} className="min-w-0">
          <span
            className="truncate text-xs text-fg-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
            title={repo.label ?? repo.path}
          >
            {repo.label ?? repo.path}
          </span>
        </Inline>
      </Stack>
    </label>
  );
}
