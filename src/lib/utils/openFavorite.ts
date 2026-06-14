import type { FavoriteRepo,Project  } from "@/lib/types";

/** Browser-safe base64url, matching the back's `Buffer.from(path).toString("base64url")`. */
function base64url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Basename of a posix/win path (used as a card label fallback). */
export function repoBasename(repoPath: string): string {
  const parts = repoPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? repoPath;
}

/** The label shown on a favorite card: explicit label, else the path basename. */
export function repoLabel(repo: FavoriteRepo): string {
  return repo.label ?? repoBasename(repo.path);
}

/**
 * Resolve a favorite to the `Project` the workspace store expects. Prefers a
 * scanned project matched by path (richer metadata); otherwise constructs a
 * minimal project from the favorite path, mirroring the back's id derivation so
 * a later scan reconciles to the same id.
 */
export function projectForFavorite(repo: FavoriteRepo, scanned: Project[]): Project {
  const match = scanned.find((p) => p.path === repo.path);
  if (match) return match;
  return {
    id: base64url(repo.path),
    name: repoLabel(repo),
    path: repo.path,
    claudeDir: `${repo.path}/.claude`,
    hasAgents: false,
    hasSkills: false,
    hasSettings: false,
    agentCount: 0,
    skillCount: 0,
  };
}
