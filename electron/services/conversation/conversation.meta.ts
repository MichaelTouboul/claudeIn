import { getDb } from "../core/db";

// App-owned annotations for on-disk conversations. NEVER writes to ~/.claude —
// only this app's own SQLite DB. All of pin/archive/soft-delete are reversible
// (set the column back to NULL). Nothing here touches the filesystem: there is
// no destructive on-disk delete by design.

export type ConversationMeta = {
  sessionId: string;
  pinnedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  note: string | null;
  aiTitle: string | null;
  userTitle: string | null;
  clearedAt: string | null;
  color: string | null;
};

// sql.js is synchronous — wrap in try/catch, never .then()/.catch().
function nowIso(): string {
  return new Date().toISOString();
}

function upsertColumn(sessionId: string, column: "pinned_at" | "archived_at" | "deleted_at" | "ai_title" | "user_title" | "cleared_at" | "color", value: string | null): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO conversation_meta (session_id, ${column}) VALUES (?, ?)
       ON CONFLICT(session_id) DO UPDATE SET ${column} = excluded.${column}`
    ).run(sessionId, value);
  } catch {
    // Defensive: a corrupt/missing table should not crash the IPC call.
  }
}

export function pin(sessionId: string): void {
  upsertColumn(sessionId, "pinned_at", nowIso());
}

export function unpin(sessionId: string): void {
  upsertColumn(sessionId, "pinned_at", null);
}

export function archive(sessionId: string): void {
  upsertColumn(sessionId, "archived_at", nowIso());
}

export function unarchive(sessionId: string): void {
  upsertColumn(sessionId, "archived_at", null);
}

export function softDelete(sessionId: string): void {
  upsertColumn(sessionId, "deleted_at", nowIso());
}

export function restore(sessionId: string): void {
  upsertColumn(sessionId, "deleted_at", null);
}

export function setAiTitle(sessionId: string, title: string): void {
  upsertColumn(sessionId, "ai_title", title);
}

// A user-set title overrides the AI title in the listing. An empty/whitespace
// title clears it (stored as NULL) so the row falls back to the AI title.
export function setUserTitle(sessionId: string, title: string): void {
  const trimmed = title.trim();
  upsertColumn(sessionId, "user_title", trimmed === "" ? null : trimmed);
}

// Per-conversation accent color. `color` is one of the `AvatarHue` values
// ("red", "blue", …) or NULL for "Default" (no color → no dot). App-owned;
// never written to ~/.claude. Passing null clears it.
export function setColor(sessionId: string, color: string | null): void {
  upsertColumn(sessionId, "color", color);
}

// Durable `/clear`: records a "cleared boundary" timestamp keyed by the
// claudeSessionId (= the .jsonl transcript name). `loadConversation` then
// returns only messages strictly after this timestamp, so the conversation
// reloads empty/fresh. The transcript file is never deleted. Reversible (NULL).
export function clearConversation(sessionId: string): void {
  upsertColumn(sessionId, "cleared_at", nowIso());
}

export function unclearConversation(sessionId: string): void {
  upsertColumn(sessionId, "cleared_at", null);
}

// Explicit boundary setter (used in tests / future programmatic boundaries).
export function setClearedAt(sessionId: string, clearedAt: string | null): void {
  upsertColumn(sessionId, "cleared_at", clearedAt);
}

export function getMeta(sessionId: string): ConversationMeta | null {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT session_id, pinned_at, archived_at, deleted_at, note, ai_title, user_title, cleared_at, color FROM conversation_meta WHERE session_id = ?")
      .get(sessionId);
    if (!row) return null;
    return {
      sessionId: row.session_id as string,
      pinnedAt: (row.pinned_at as string | null) ?? null,
      archivedAt: (row.archived_at as string | null) ?? null,
      deletedAt: (row.deleted_at as string | null) ?? null,
      note: (row.note as string | null) ?? null,
      aiTitle: (row.ai_title as string | null) ?? null,
      userTitle: (row.user_title as string | null) ?? null,
      clearedAt: (row.cleared_at as string | null) ?? null,
      color: (row.color as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export function listMeta(): ConversationMeta[] {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT session_id, pinned_at, archived_at, deleted_at, note, ai_title, user_title, cleared_at, color FROM conversation_meta")
      .all();
    return rows.map((row) => ({
      sessionId: row.session_id as string,
      pinnedAt: (row.pinned_at as string | null) ?? null,
      archivedAt: (row.archived_at as string | null) ?? null,
      deletedAt: (row.deleted_at as string | null) ?? null,
      note: (row.note as string | null) ?? null,
      aiTitle: (row.ai_title as string | null) ?? null,
      userTitle: (row.user_title as string | null) ?? null,
      clearedAt: (row.cleared_at as string | null) ?? null,
      color: (row.color as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}
