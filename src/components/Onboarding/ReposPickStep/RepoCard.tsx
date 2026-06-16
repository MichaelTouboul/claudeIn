import { Badge } from "@/components/_ui/Badge";
import { Checkbox } from "@/components/_ui/Checkbox";
import type { RepoCandidate } from "@/lib/types";
import { repoBasename } from "@/lib/utils";

import { avatarLetter, avatarVariant } from "./repoAvatar";
import { languageDotColor } from "./repoLanguage";

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
        className="h-9 w-9 shrink-0 rounded-md object-cover"
        style={{ background: "var(--color-surface-3)" }}
      />
    );
  }
  return (
    <Badge
      variant={avatarVariant(name)}
      shape="rounded"
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center !px-0 text-sm font-semibold"
    >
      {avatarLetter(name)}
    </Badge>
  );
}

/** The language indicator: a colored dot + the language name (mock's LANG_DOT). */
function RepoLanguage({ language }: { language: string }) {
  return (
    <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg-muted">
      <span
        data-lang-dot
        aria-hidden
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: languageDotColor(language) }}
      />
      {language}
    </span>
  );
}

/**
 * One scanned repo as a selectable tile (Step 6): a detected logo (or a
 * deterministic colored letter avatar fallback), the repo name, a two-line
 * description (the LLM `label`, falling back to the path), the detected primary
 * language (a colored dot + name, omitted when undetectable), and the favorite
 * toggle. The whole tile is a `<label>` so clicking it flips the checkbox; a
 * selected tile swaps to the accent border + subtle accent fill.
 */
export function RepoCard({ repo, checked, onToggle }: RepoCardProps) {
  const name = repoBasename(repo.path);
  const description = repo.label ?? repo.path;
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]"
      style={{
        fontFamily: "var(--font-sans)",
        borderColor: checked ? "var(--color-accent)" : "var(--color-border)",
        background: checked ? "var(--color-accent-dim)" : "var(--color-surface-2)",
      }}
    >
      <RepoAvatar name={name} logoDataUrl={repo.logoDataUrl} />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">{name}</span>
        <span
          className="mt-1 block text-xs leading-relaxed text-fg-subtle"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
          title={description}
        >
          {description}
        </span>
        {repo.language !== null ? <RepoLanguage language={repo.language} /> : null}
      </div>
      <Checkbox
        checked={checked}
        onCheckedChange={() => onToggle(repo.path)}
        className="mt-0.5 shrink-0"
        aria-label={`Favorite ${name}`}
      />
    </label>
  );
}
