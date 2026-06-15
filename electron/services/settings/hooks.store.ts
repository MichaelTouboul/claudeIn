import { getDb } from "../core/db";
import type { SettingsSource } from "../../types/settings.types";

/**
 * `disabled_hooks` DB store — the app-owned record of hooks the user has disabled.
 *
 * Disabling a hook removes its `{ type, command }` entry from the on-disk
 * settings.json (so Claude Code stops running it) and records the removed entry
 * here, verbatim, keyed by the hook's stable id. Enabling re-inserts it into the
 * file and deletes the row. sql.js is synchronous → wrap in try/catch.
 */

export interface DisabledHookRow {
  id: string;
  scope: SettingsSource;
  event: string;
  matcher: string | null;
  command: string;
  layerPath: string;
  removedAt: string;
}

function rowToDisabled(row: Record<string, unknown>): DisabledHookRow {
  return {
    id: String(row.id),
    scope: row.scope as SettingsSource,
    event: String(row.event),
    matcher: row.matcher == null ? null : String(row.matcher),
    command: String(row.command),
    layerPath: String(row.layer_path),
    removedAt: row.removed_at == null ? "" : String(row.removed_at),
  };
}

/** Every recorded-disabled hook. Empty on any DB error (never throws). */
export function listDisabled(): DisabledHookRow[] {
  try {
    return getDb()
      .prepare("SELECT * FROM disabled_hooks")
      .all()
      .map(rowToDisabled);
  } catch {
    return [];
  }
}

/** The set of disabled hook ids (cheap membership test for `getHooks`). */
export function disabledIds(): Set<string> {
  return new Set(listDisabled().map((r) => r.id));
}

/** The stored row for one id, or undefined if not disabled / on error. */
export function getDisabled(id: string): DisabledHookRow | undefined {
  try {
    const row = getDb()
      .prepare("SELECT * FROM disabled_hooks WHERE id = ?")
      .get(id);
    return row ? rowToDisabled(row) : undefined;
  } catch {
    return undefined;
  }
}

/** Record a removed hook so it can be restored. Idempotent (PK upsert). */
export function recordDisabled(row: Omit<DisabledHookRow, "removedAt">): void {
  try {
    getDb()
      .prepare(
        `INSERT INTO disabled_hooks (id, scope, event, matcher, command, layer_path, removed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           scope = excluded.scope,
           event = excluded.event,
           matcher = excluded.matcher,
           command = excluded.command,
           layer_path = excluded.layer_path,
           removed_at = excluded.removed_at`,
      )
      .run(
        row.id,
        row.scope,
        row.event,
        row.matcher,
        row.command,
        row.layerPath,
        new Date().toISOString(),
      );
  } catch {
    // Defensive: a corrupt/missing table must not crash the IPC call.
  }
}

/** Forget a disabled hook (called after re-inserting it into the file). */
export function removeDisabled(id: string): void {
  try {
    getDb().prepare("DELETE FROM disabled_hooks WHERE id = ?").run(id);
  } catch {
    // Defensive — see recordDisabled.
  }
}
