import { Select } from "@/components/_ui/Select";
import { Stack } from "@/components/_ui/Stack";
import type { FavoriteRepo } from "@/lib/types";
import { repoLabel } from "@/lib/utils";

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
    <Stack gap={1.5}>
      <Select
        aria-label="Repository scope"
        disabled={empty}
        value={value ?? NONE}
        onChange={(e) => onChange(e.target.value === NONE ? null : e.target.value)}
      >
        <option value={NONE}>{empty ? "No favorite repos yet" : "No repository"}</option>
        {repos.map((repo) => (
          <option key={repo.path} value={repo.path}>
            {repoLabel(repo)}
          </option>
        ))}
      </Select>
      {empty ? (
        <p className="px-1 text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Pin a repo on Home to scope connectors to it. Personal connectors are always shown below.
        </p>
      ) : null}
    </Stack>
  );
}
