# Conversations panel (FE, project-scoped) — design

**Date:** 2026-06-03
**Status:** Approved (design) — pending implementation, split into 3 tranches
**Scope:** Frontend Sidebar conversations surface + viewer + per-item actions, project-scoped; small backend additions (derived `status`, `conversation_meta` table). First consumer of the conversation live-tail backend.

## Context

The real session transcripts (`useSessions`/`getSessionList`/`getSessionConversation`) are
surfaced by **no UI** today (the existing `ConversationList` shows open dashboard TABS, not
on-disk sessions). Conversation status is **not persisted** by Claude Code — inferred from
mtime + the live-tail. The conversation live-tail backend (`conversation.tail`,
`watchConversation`/`onConversationAppended`) is merged but unconsumed. Several needed signals
already exist but are unwired/broken: `useEventsStore` `activeAgents`/`waitingAgents` (running/
waiting), the `ContextBar` (context %), AI title.

Everything here is **project-scoped** (active project). Global cross-project + search/
virtualization over the full archive = a later effort.

## Locked design

### Sidebar — 3 tiers (scope-filtered)
1. **Live sessions (top):** the scope's currently-active sessions, each with the **AI title**, a
   **running/waiting indicator**, and the **context progress bar** (reuse `ContextBar`).
2. **Recent sessions:** in the **existing "Sessions" accordion**, but filtered to the active
   scope only.
3. **Older sessions:** a **"Load more"** button → opens a **modal** listing older (presumed
   closed) sessions of the scope.

### Selecting a conversation → panel
Opens the conversation in the panel. On open it offers the **resume choice** like the terminal:
**compact (recommended) / continue as is** (this is the native `--resume` + compact-on-resume
flow — spawn `claude --resume <id>` with/without compaction).

### Per-item "…" menu
`pin` (épingler en haut), `clear`, `compact`, `archive`, `delete`.
- **Native, live/resume-only:** `clear` / `compact` are **in-session** commands — they only
  apply to a session ClaudeIn is **driving** (or via the resume flow). NOT standalone actions on
  a closed transcript. Surface them only for live/piloted sessions.
- **App-owned (persisted), reversible:** `pin`, `archive`, `delete` — see persistence below.

### Three accepted reserves (locked)
1. `clear`/`compact` = live/resume only (not arbitrary-transcript ops).
2. **`waiting` indicator** is reliable only for **ClaudeIn-piloted** sessions (`waitingAgents`);
   external sessions can show **live/appending** (via the tail) but not "waiting for input".
3. **`delete` = soft-delete by default** (hide in ClaudeIn, keep the `.jsonl` on disk —
   reversible, and Claude Code's `/resume` still sees it); a separate, confirm-guarded
   "delete permanently from disk" does the real `rm`.

## Backend additions

### Derived `status` on `SessionSummary`
Add `status: 'live' | 'recent' | 'idle'` to `listSessions`/`SessionSummary`, from mtime
(`lastActiveAt`): **live** < 30 s, **recent** < 6 h, else **idle** (thresholds as named
constants). Snapshot "live" is approximate; the precise live signal is the tail receiving
appends + (for piloted sessions) `activeAgents`.

### `conversation_meta` table (app-owned annotations; `~/.claude` untouched)
```sql
CREATE TABLE conversation_meta (
  session_id  TEXT PRIMARY KEY,
  pinned_at   TEXT,   -- pin (NULL=no; timestamp gives order)
  archived_at TEXT,   -- archive
  deleted_at  TEXT,   -- soft-delete
  note        TEXT
);
```
IPC to set/clear each flag (`conversation:pin`/`unpin`, `:archive`/`unarchive`,
`:softDelete`/`:restore`, and a guarded `:deleteFromDisk`). The sessions list **LEFT-JOINs**
this table so the front knows pinned/archived/deleted without touching `~/.claude`. All
reversible (set column → NULL). Migration is idempotent (PRAGMA-guarded `CREATE TABLE IF NOT
EXISTS`).

## Implementation tranches (sequential — they share env.d.ts/preload/ipc index)

**Tranche 1 — Sidebar conversations surface (read/navigate).**
Backend: derived `status` in `listSessions`. Frontend: `SessionsPanel` (distinct from the
open-tabs `ConversationList`) = 3 tiers — live (AI title + running/waiting voyant via
`activeAgents`/`waitingAgents` + `ContextBar`), recent in the existing accordion (scope-
filtered), "Load more" → modal of older sessions. Live list refresh via the existing
`watchSessions`/`session_activity`. No viewer yet (rows select but open is tranche 2).

**Tranche 2 — Viewer + live-tail + resume/compact.**
Selecting a session opens it in the panel: `getSessionConversation` initial render (messages via
`ResponseBody`), then **wire the live-tail** (`watchConversation` + `onConversationAppended`,
dedupe by `uuid`) — first consumer of `conversation.tail`. Plus the resume choice
(compact recommended / continue as is) driving `claude --resume`.

**Tranche 3 — "…" menu + `conversation_meta`.**
The table + IPC + list join; the "…" menu wiring: pin/archive/soft-delete (app-owned,
reversible) and clear/compact (native, live/piloted only) + "delete permanently" (guarded).

## Testing (per tranche)
- T1: backend `status` classification at thresholds; `SessionsPanel` renders the 3 tiers,
  scope filter, status/running/waiting badges, "Load more" opens the modal; refetch on
  `session_activity`.
- T2: viewer initial render; live append (mock `onConversationAppended`) dedupe by uuid;
  resume/compact triggers the right spawn args; not-found state.
- T3: `conversation_meta` migration idempotent; pin/archive/soft-delete set+clear timestamps;
  the list join hides soft-deleted + orders pinned first; "delete permanently" guarded.

## File layout (indicative)
```
electron/services/session.service.ts                 ← + derived status (thresholds const)
electron/services/conversation.meta.ts (+ .test)      ← conversation_meta CRUD (pin/archive/softDelete/restore)
electron/services/db.ts                               ← + conversation_meta table (idempotent migration)
electron/ipc/sessions.ipc.ts                          ← + conversation:pin/archive/softDelete/... handlers
electron/preload.ts + src/env.d.ts                    ← + the new methods
src/hooks/useSessions.ts                              ← + status + meta flags on SessionSummary
src/components/Workspace/Sidebar/SessionsPanel/...    ← 3-tier panel, rows, "Load more" modal, "…" menu
src/components/Workspace/Sidebar/SessionsPanel/SessionViewer/... ← panel viewer + live-tail (T2)
```
Reuse `_ui/Dialog` (modal), `_ui/Progress`/`ContextBar` (context %), `ResponseBody` (message
render), `useEventsStore` (running/waiting). Split files to stay < 300 lines.

## Out of scope (later)
- Global cross-project view + search/virtualization over the full archive.
- The `waiting` signal for external (non-piloted) sessions.
- Persisting status.
```
