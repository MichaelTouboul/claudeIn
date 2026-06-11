# Self-Improve Loop — Design

**Date:** 2026-06-11
**Status:** Approved (brainstorming)

## Goal

Give the app a hybrid self-improvement loop: the **user** only files a request
(feature / bug / design / …); an **LLM** scopes it via a short component-aware chat;
an **autonomous Claude session** develops + merges it; the user gets an in-app
**notification** and an **Update** affordance. Pre-v0 power feature, **dev-mode only**.

Name: user-facing **"Improve this…"** (context menu) + **`/improve`** (prompt command,
alias `/feature-request`). Internal: **Self-Improve loop**.

## Architecture (decided)

- **Bridge = inbox + session-runner.** The app writes a structured request to a
  watched inbox dir; a Claude Code `/loop` watcher the user keeps running picks it up,
  runs the existing dev-loop (worktree → feature-dev → gate → merge → push), and writes
  a status marker the app watches. Inbox = the future queue (no queue yet: if the runner
  is offline the request waits).
- **Context-awareness = build plugin.** A Babel/Vite plugin (dev) injects
  `data-component="Name"` + `data-source="src/…/X.tsx:line"` on JSX elements. A resolver
  walks from the clicked element to the nearest annotated ancestor → `{ component,
  sourcePath }`. Stripped in prod → the feature is dev-only.
- **Update = HMR in dev.** Since the user runs `npm run dev`, the merge into `main`
  updates the working tree → Vite HMR applies it live. The "Update" button = renderer
  reload (safety) + mark-read. Main-process changes still need a small relaunch (flagged).

## Pieces

### 1. Entry points
- Context menu: right-click anywhere → an "Improve this…" item (alongside native
  options) captures the clicked component (via the resolver) and opens the modal.
- Prompt command: `/improve` (alias `/feature-request`) opens the SAME modal with no
  target component (general request).

### 2. Modal chat (the powerful part)
- Small modal (not fullscreen). Header: a **type dropdown** — `Feature · Bug · Design ·
  Performance · Copy` (inline literal union, enum+behavior where it drives behavior).
- Engine: each turn is a `claude --print` call (the app's existing subscription path),
  seeded with a system prompt + component context (**name + sourcePath + the source file
  contents**, read by the app). No tool-use — it discusses, never edits.
- Flow: a short scoping dialogue (assistant asks 1–3 targeted questions), then proposes a
  structured recap; the user clicks **"Send to Claude"** → the app writes the request to
  the inbox.

### 3. Request schema + inbox
JSON file in a watched dir `~/.claude-agent-manager/improve-inbox/<id>.json`:
```
{ id, createdAt, type, component?, sourcePath?, title, description,
  acceptance: string[], transcript: {role, text}[], status: 'pending' }
```

### 4. Session-runner (Claude Code `/loop` watcher — a skill/prompt, NOT app code)
Watches the inbox; for each `pending`: runs the dev-loop (worktree → feature-dev TDD/gate
→ merge `main` → push) with `title/description/acceptance/sourcePath` as the prompt, then
rewrites the file `status: 'merged'` (+ `commit`, `summary`) or `status: 'failed'` (+ reason).

### 5. Done → notification → update
The app watches the inbox (reuse `session.watch`/chokidar). On `merged` → an in-app
notification element (discreet badge/toast "An improvement is ready"). "Update" → renderer
reload + mark-read; main-process changes → small relaunch (signalled).

## v0 scope (assumed)
No queue (inbox just waits), runner must be running, dev-mode only (source attrs + HMR).
Main risk: the autonomous runner merges to `main` without human review — the **gate** is
the guardrail; a later "open a PR instead of merge" tier is possible.

## Phases (autonomous, gate + merge + push between each)
- **I1** — Inbox: `ImproveRequest` schema/types + service (write/list/update-status/watch)
  + IPC + preload + `env.d.ts` + the `/loop` watcher contract (skill/prompt doc). No UI.
- **I2** — Build plugin (`data-component`/`data-source`) + `elementToComponent` resolver.
- **I3** — Entry points: "Improve this…" context-menu item + `/improve` prompt command.
- **I4** — Modal chat (`--print` engine + UI + type dropdown) → writes the request.
- **I5** — Notification element + "Update" button (HMR reload).
