import { Badge } from "@/components/_ui/Badge";
import { Checkbox } from "@/components/_ui/Checkbox";
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
        className="h-8 w-8 shrink-0 rounded-md object-cover"
        style={{ background: "var(--color-surface-3)" }}
      />
    );
  }
  return (
    <Badge
      variant={avatarVariant(name)}
      shape="rounded"
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center !px-0 text-sm font-semibold"
    >
      {avatarLetter(name)}
    </Badge>
  );
}

/**
 * One scanned repo as a selectable card matching the design-system onboarding
 * kit's repo row: a detected logo (or a deterministic colored letter avatar
 * fallback), the repo name, a truncated mono label/description, and the favorite
 * toggle. The whole card is a `<label>` so clicking it flips the checkbox; a
 * selected card swaps to the accent border + subtle accent fill.
 */
export function RepoCard({ repo, checked, onToggle }: RepoCardProps) {
  const name = repoBasename(repo.path);
  return (
    <label
      className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]"
      style={{
        fontFamily: "var(--font-sans)",
        borderColor: checked ? "var(--color-accent)" : "var(--color-border)",
        background: checked ? "var(--color-accent-dim)" : "var(--color-surface-2)",
      }}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={() => onToggle(repo.path)}
        className="shrink-0"
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
