import { getDb } from "../core/db";
import type { FavoriteRepo } from "../../types/user.interface";

/**
 * Favorite repos persistence — the `favorite_repos` table, keyed by `path`.
 * Surfaced on the Home page. sql.js is synchronous; calls go through the DB
 * wrapper. List order is insertion order (`rowid`), stable across same-instant
 * inserts where `added_at` ties.
 */

function rowToFavorite(row: Record<string, unknown>): FavoriteRepo {
  return {
    path: row.path as string,
    label: typeof row.label === "string" ? row.label : null,
    addedAt: row.added_at as string,
    logoDataUrl: typeof row.logo_data_url === "string" ? row.logo_data_url : null,
  };
}

/** All favorite repos, in the order they were added. */
export function list(): FavoriteRepo[] {
  return getDb()
    .prepare(
      "SELECT path, label, added_at, logo_data_url FROM favorite_repos ORDER BY rowid ASC",
    )
    .all()
    .map(rowToFavorite);
}

/**
 * Add (or re-label) a favorite repo. Idempotent on `path`: a repeat upserts the
 * label without creating a duplicate. `logoDataUrl` is the scan-time detected
 * logo (a base64 `data:` URL); a re-add that omits it keeps the existing logo
 * rather than clearing it (`COALESCE`). Returns the stored favorite.
 */
export function add(path: string, label?: string, logoDataUrl?: string | null): FavoriteRepo {
  const addedAt = new Date().toISOString();
  const stored: FavoriteRepo = {
    path,
    label: label ?? null,
    addedAt,
    logoDataUrl: logoDataUrl ?? null,
  };
  getDb()
    .prepare(
      `INSERT INTO favorite_repos (path, label, added_at, logo_data_url) VALUES (?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET
         label = excluded.label,
         logo_data_url = COALESCE(excluded.logo_data_url, favorite_repos.logo_data_url)`,
    )
    .run(stored.path, stored.label, stored.addedAt, stored.logoDataUrl);
  return stored;
}

/** Remove a favorite repo by path. No-op when the path is not favorited. */
export function remove(path: string): void {
  getDb().prepare("DELETE FROM favorite_repos WHERE path = ?").run(path);
}
