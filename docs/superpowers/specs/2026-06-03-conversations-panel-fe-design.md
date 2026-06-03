# Conversations panel (FE, project-scoped) — design

**Date:** 2026-06-03
**Status:** Approved (design) — pending implementation
**Scope:** Frontend Sidebar panel + viewer that surfaces the project's real `~/.claude` session transcripts, live; a small backend `status` addition. First consumer of the conversation live-tail backend.

## Context & decisions

The real session transcripts (`useSessions`/`getSessionList`/`getSessionConversation`) are
**read by no UI today** — the existing `ConversationList` shows open dashboard TABS, not
on-disk sessions. Conversation status is **not persisted** (established earlier); it's inferred
from mtime + the live-tail. The conversation live-tail backend (`conversation.tail`,
`watchConversation`/`onConversationAppended`) is merged but unconsumed.

Decisions (from the discussion):
- Build **both** live + history, **starting project-scoped** (active project; global
  cross-project + heavy search/virtualization = a later tranche).
- **Dedicated Sidebar panel** for conversations (list in the sidebar; viewer in an overlay).
- **Status derived in the backend** (`listSessions` returns `status`), front just displays.
- A single project-scoped panel serves both: the list = history-for-this-project + at-a-glance
  live status; opening one = the live viewer.

## Backend (small) — add derived `status`

Add `status: 'live' | 'recent' | 'idle'` to `SessionSummary` (both the backend
`session.service.listSessions` return and the `src/hooks/useSessions.ts` type), derived from
the file mtime (`lastActiveAt`) with named thresholds: **live** < ~30 s, **recent** < ~6 h,
else **idle**. (A snapshot's "live" is approximate; the *precise* live signal is the viewer's
tail receiving appends.) Everything else already exists — no other backend change.

## Frontend

### Sidebar: `SessionsPanel` (new, distinct from `ConversationList`)
- A new Sidebar section listing the **active project's** sessions via `useSessions(projectPath)`
  (`getSessionList`), already sorted by `lastActiveAt` desc. Each row: `title || firstPrompt`
  (truncated), a **status badge** (`● live` green-pulse / `recent` / `idle` muted), and small
  meta (model, messageCount, branch). Empty state when none.
- **Live list refresh:** on active scope, call `watchSessions(projectPath)` and refetch the
  list on the existing `session_activity` push (via `onEvent`), debounced; `unwatchSessions`
  on scope change/unmount. (This is the existing list watcher — reused, not rebuilt.)
- Naming: the component is `SessionsPanel` to avoid colliding with the open-tabs
  `ConversationList`; UI label TBD by the user (e.g. "Sessions" / "History") — keep it distinct
  from the open-tabs list visually.

### Viewer: overlay (`_ui/Dialog`)
- Clicking a session row opens an overlay viewer. On open: `getSessionConversation(filePath)`
  → render each `SessionMessage` read-only via `ResponseBody` (markdown/code/diff blocks —
  consistent with the chat surface, pillar 1), user vs assistant styled like `MessageRow`.
- **Live-tail (first consumer of `conversation.tail`):** after the initial load, call
  `watchConversation(filePath)` and subscribe `onConversationAppended` → append delta
  `SessionMessage[]` (dedupe by `uuid`; ignore deltas for other `filePath`s); the row/viewer
  shows `live` while appends arrive. `unwatchConversation(filePath)` on close/unmount.
- Scroll: auto-stick to bottom on new messages unless the user scrolled up (basic tail UX).

## Data flow

```
useSessions(projectPath).getSessionList ──► SessionsPanel list (status badges, sorted)
   ▲ refetch on session_activity (watchSessions)
row click ──► overlay: getSessionConversation(filePath) [initial]
                       + watchConversation(filePath) ──► onConversationAppended ──► append live
```

## Error handling / edge cases

- No project scope (launcher/user scope) → panel shows an empty/"select a project" state.
- `getSessionConversation` fails / file gone → viewer not-found state.
- Delta for a non-open `filePath` → ignored (match on filePath).
- Large transcript → initial load may be big; render is read-only `ResponseBody` (acceptable
  v1; virtualization is a later/archive concern).
- `status` thresholds are constants in one place (backend); front never recomputes.

## Testing

- **Backend** `listSessions` status: temp dir with files of varying mtime → assert
  live/recent/idle classification at the thresholds.
- **`SessionsPanel`** (mock `window.api.getSessionList`): renders rows + status badges sorted;
  empty state; refetches on a `session_activity` event.
- **Viewer** (mock `getSessionConversation` + `onConversationAppended`): initial messages
  render; an appended delta is added live; dedupe by uuid; not-found state.

## File layout

```
electron/services/session.service.ts        ← + derived `status` in listSessions (thresholds const)
src/hooks/useSessions.ts                     ← + `status` on SessionSummary
src/components/Workspace/Sidebar/SessionsPanel/SessionsPanel.tsx (+ .test)   ← list + status + watchSessions refresh
src/components/Workspace/Sidebar/SessionsPanel/SessionRow/SessionRow.tsx     ← one row (badge/meta)
src/components/Workspace/Sidebar/SessionsPanel/SessionViewer/SessionViewer.tsx (+ .test) ← _ui/Dialog overlay; getSessionConversation + live-tail
src/components/Workspace/Sidebar/Sidebar.tsx (or PanelsArea) ← mount the SessionsPanel section
```
(Split viewer message-rendering into a sibling if it nears 300 lines; reuse `ResponseBody`.)

## Out of scope (later)

- Global cross-project sessions view + search/virtualization over the full archive (tranche 2).
- Resuming/forking a session from the viewer.
- Renaming/relabeling the existing open-tabs `ConversationList`.
- Persisting any status.
```
