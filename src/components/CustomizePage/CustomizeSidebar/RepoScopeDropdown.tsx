import { repoLabel } from "@/components/HomePage/openFavorite";
import type { FavoriteRepo } from "@/types/user.types";

export type RepoScopeDropdownProps = {
  repos: FavoriteRepo[];
  /** Active repo path, or null for "no repo" (Personal scope only). */
  value: string | null;
  onChange: (repoPath: string | null) => void;
};

const NONE = "__none__";

// Favorite-repos scope selector. Selecting a repo sets the active project scope
// (its path); the placeholder option clears it. A native <select> for built-in
// keyboard operability and an explicit accessible name. With no favorite repos
// the control is disabled and a hint explains how to pin one (Personal scope is
// always available).
export function RepoScopeDropdown({ repos, value, onChange }: RepoScopeDropdownProps) {
  const empty = repos.length === 0;

  return (
    <div className="flex flex-col gap-1.5">
      <select
        aria-label="Repository scope"
        disabled={empty}
        value={value ?? NONE}
        onChange={(e) => onChange(e.target.value === NONE ? null : e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-60"
        style={{
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <option value={NONE}>{empty ? "No favorite repos yet" : "No repository"}</option>
        {repos.map((repo) => (
          <option key={repo.path} value={repo.path}>
            {repoLabel(repo)}
          </option>
        ))}
      </select>
      {empty ? (
        <p className="px-1 text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Pin a repo on Home to scope connectors to it. Personal connectors are always shown below.
        </p>
      ) : null}
    </div>
  );
}
