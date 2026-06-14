import type { RepoCandidate } from "@/lib/types";
import { repoBasename } from "@/lib/utils";

type RepoRowProps = {
  repo: RepoCandidate;
  checked: boolean;
  onToggle: (repoPath: string) => void;
};

/** One scanned repo: a labelled checkbox + the LLM label / path detail. */
export function RepoRow({ repo, checked, onToggle }: RepoRowProps) {
  const name = repoBasename(repo.path);
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded border border-border bg-surface-2 p-3"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(repo.path)}
        className="mt-1 accent-[var(--color-accent)]"
        aria-label={`Favorite ${name}`}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-fg">{name}</span>
        <span className="block truncate text-xs text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
          {repo.label ?? repo.path}
        </span>
      </span>
    </label>
  );
}
