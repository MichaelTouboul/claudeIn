import { Spinner } from "@/components/_ui/Spinner";
import { repoBasename } from "@/lib/utils";

type PendingRepoCardProps = {
  /** Absolute path of the folder being scanned + added. */
  path: string;
};

/**
 * Optimistic placeholder shown while a freshly-added repo is scanned for its
 * logo + one-line description (the LLM label can take a few seconds). Mirrors the
 * real card's shell so the swap is seamless: the folder name is known up front;
 * a spinner stands in for the avatar and a "Detecting…" line for the subtitle.
 */
export function PendingRepoCard({ path }: PendingRepoCardProps) {
  const name = repoBasename(path);
  return (
    <div
      data-pending-repo-card
      aria-busy="true"
      className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface-1 p-4"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-subtle">
          <Spinner size="sm" aria-label={`Adding ${name}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg" title={path}>
            {name}
          </p>
          <p className="truncate text-xs text-fg-subtle">Detecting logo and description…</p>
        </div>
      </div>
      <div className="h-7 rounded-md bg-surface-2" />
    </div>
  );
}
