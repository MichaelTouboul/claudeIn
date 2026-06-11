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
// (its path), the placeholder option clears it. A native <select> for built-in
// keyboard operability and an explicit accessible name.
export function RepoScopeDropdown({ repos, value, onChange }: RepoScopeDropdownProps) {
  return (
    <select
      aria-label="Repository scope"
      value={value ?? NONE}
      onChange={(e) => onChange(e.target.value === NONE ? null : e.target.value)}
      className="w-full rounded-lg px-3 py-2 text-sm"
      style={{
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <option value={NONE}>No repository</option>
      {repos.map((repo) => (
        <option key={repo.path} value={repo.path}>
          {repoLabel(repo)}
        </option>
      ))}
    </select>
  );
}
