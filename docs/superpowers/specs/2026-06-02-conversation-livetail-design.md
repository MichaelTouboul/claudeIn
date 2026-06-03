# Conversation live-tail mirror — design

**Date:** 2026-06-02
**Status:** Approved (design, autonomous) — pending implementation
**Scope:** Backend live-tail of an open conversation + IPC; renderer wiring IF a conversation viewer exists. Additive.

## Context

Conversations are the one data type that already had live watching — `session.watch.ts`
broadcasts a `session_activity` ping when the sessions dir changes (the LIST is live). But the
**content of an open conversation is not live**: `loadConversation(filePath)` is a one-shot
read, so messages appended by a live `claude` session (running in a terminal or elsewhere)
don't stream into an open conversation in ClaudeIn. This slice adds the missing piece:
**live-tail the active transcript** — the core of "watch a Claude Code session run in real
time" (pillar 3 + the live-source-of-truth north star).

## Decisions (locked, autonomous)

- **v1 tails the OPEN conversation by `filePath`** (the active transcript), not all transcripts.
- **Incremental, append-only parse:** keep a per-file cursor (byte offset + parsed-message
  count); on change, read only the appended bytes, parse complete new JSONL lines, broadcast
  the **delta** (new messages only) — not the whole conversation.
- **Additive:** `listSessions`/`loadConversation`/`session.watch` (the list watcher) are
  untouched. Reuse `session.transcript.ts` parsing helpers + the existing
  `SessionConversation`/message types from `session.service.ts`.
- **Robust to partial writes / rewrites:** buffer an incomplete trailing line until completed;
  if the file shrinks below the cursor (truncate/rewrite — rare for append-only transcripts),
  reset the cursor and re-read from the start.
- **RAM-only** cursors; no DB.

## Backend — `electron/services/conversation.tail.ts`

```ts
export function watchConversation(filePath: string): void;
export function unwatchConversation(filePath: string): void;
```
- `watchConversation(filePath)`: record a cursor (start at current file size + the message
  count from an initial parse, OR 0 if the caller will seed via `getSessionConversation`),
  `fs.watch` the file's parent dir filtered to its basename (write-then-rename safe), debounce
  ~80–120 ms. On change: `fs.stat`; if `size < cursor.offset` → reset (truncated); read bytes
  `[cursor.offset, size)`, split on newlines, keep a trailing-partial buffer, parse each
  complete line via the shared transcript parser into the same message shape `loadConversation`
  yields; if any new messages → advance the cursor and `broadcast({ type:
  'conversation_appended', filePath, messages })`.
- Keep watchers + cursors in a module-level `Map` keyed by `filePath`; re-entrancy guard;
  `unwatchConversation` closes the watcher, clears the timer, drops the cursor.
- Never throws (parse errors on a line → skip that line).

## IPC surface (`window.api`)

- `conversation:watch` → `watchConversation(filePath): Promise<void>`
- `conversation:unwatch` → `unwatchConversation(filePath): Promise<void>`
- push `conversation_appended` → `onConversationAppended(cb: (data: { filePath: string; messages: ConversationMessage[] }) => void): () => void` (filters the shared `push-event` channel by `type`).

Handlers in `electron/ipc/sessions.ipc.ts` (same domain as the existing session/conversation
handlers). Renderer-facing message type reuses the existing `SessionConversation` message type
(`src/hooks/useSessions.ts`); add the small `onConversationAppended` signature to `env.d.ts` +
preload.

## Renderer wiring (only if a conversation viewer exists)

Investigate whether a component renders a conversation via `getSessionConversation` (a session
viewer). **If yes:** on open, after the initial `getSessionConversation(filePath)` load, call
`watchConversation(filePath)` and subscribe `onConversationAppended` → append the delta messages
to the displayed conversation (dedupe by index/id; ignore deltas for other `filePath`s); call
`unwatchConversation` on close/unmount. **If no such viewer exists yet**, stop at the backend +
IPC (a follow-up slice wires the UI) and report that clearly.

## Error handling / edge cases

- Incomplete trailing JSONL line → buffered, parsed once completed.
- File truncated/rewritten (size < cursor) → cursor reset, re-read from start.
- Rapid appends → debounced; each flush reads everything new since the cursor (no missed lines).
- Watching a non-existent file → no-op (don't throw); arming when the file appears is out of
  scope (the caller watches a file it just loaded).

## Testing

- **`conversation.tail`** (temp dir): write a `.jsonl`, `watchConversation`, append assistant
  lines → assert a `conversation_appended` broadcast (`vi.mock('./broadcast')`) with only the
  new messages; append again → only the newer delta; write a partial line then complete it →
  one message once complete; truncate/rewrite → cursor resets and re-emits; `unwatchConversation`
  stops further broadcasts. Use a `waitFor` poller (per `pty.service.test.ts`); `settle()` after
  `watchConversation` to absorb fs.watch arming latency (the documented watch-test pattern);
  always `unwatchConversation` in `afterEach`.

## File layout

```
electron/services/conversation.tail.ts (+ .test)   ← incremental tail + cursor + watch + broadcast
electron/ipc/sessions.ipc.ts                         ← + conversation:watch / :unwatch
electron/preload.ts + src/env.d.ts                   ← + watchConversation / unwatchConversation / onConversationAppended
(renderer)                                           ← wire into the conversation viewer IF one exists
```

Backend lint caveat (as before): real backend gate is `npx electron-vite build` + Vitest;
uphold no-`any`/named-imports/300-line by hand.

## Out of scope (later)

- Tailing ALL transcripts at once / a global live feed.
- Replacing the existing `session_activity` list watcher (kept as-is).
- Renderer viewer UI from scratch (only wire an existing one).
- Persisting tail cursors.
```
