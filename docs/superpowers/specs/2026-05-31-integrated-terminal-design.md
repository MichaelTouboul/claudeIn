# Design — Integrated terminal (bottom panel)

**Date:** 2026-05-31
**Status:** Approved (brainstorming) — pending implementation plan
**Pillar:** UX beyond the terminal (`docs/roadmap.md` Phase 0)

## Problem

The app has a bottom `EventConsole` (a read-only log of agent hook events with
token/cost), but **no real interactive terminal**. The user wants a VS Code-style
integrated terminal at the bottom of the screen — a true shell where they can run
`git`, `npm`, anything — without leaving the app.

## Decision context (consciously accepted trade-offs)

- **Roadmap:** a generic integrated terminal is otherwise table-stakes Anthropic
  gives away free; it was previously a "coming soon" pane. The user has chosen to
  build it now anyway. `docs/roadmap.md` is updated to move Terminal from "coming
  soon" to "building".
- **Native module:** a real interactive terminal requires a native pseudo-terminal
  (`node-pty`). This is the project's **first deliberate native-module runtime
  dependency** (the project otherwise uses sql.js/WASM to avoid native pain). The
  cost — `electron-rebuild`, per-platform binaries, signing — is accepted. `node-pty`
  is the most battle-tested Electron native module (VS Code, Hyper), so the path is
  well-trodden.

## Decisions (from brainstorming)

- **Real terminal:** `xterm.js` (renderer display + input) + `node-pty` (main
  process pty).
- **Bottom panel = tabbed** (VS Code style): a collapsible/resizable panel with
  `Terminal` and `Events` tabs. The existing `EventConsole` becomes the `Events`
  tab and moves into the new panel.
- **One pty per project:** cwd = the project directory; created lazily on first
  open; persists while the app runs (switching projects keeps each project's pty
  and scrollback); killed on app quit and on project removal.
- **Shell:** `process.env.SHELL` (mac/linux) / `COMSPEC` or PowerShell (Windows).

## Architecture

Cross-cutting (main + renderer):

```
RENDERER (src/)                         MAIN (electron/)
xterm.js (display + input)              node-pty (the real pseudo-terminal)
  keystroke ──IPC pty:write──▶          pty.write()
  resize ────IPC pty:resize──▶          pty.resize(cols, rows)
  xterm.write() ◀──push pty:data──      pty.onData()
```

- **`node-pty` lives in the main process** (Node) — mandatory under
  contextIsolation; the renderer only displays via xterm + IPC.
- New IPC channels (`pty` domain): `pty:create`, `pty:write`, `pty:resize`,
  `pty:kill`, plus a `pty:data` push to the renderer. Declared in `preload.ts` and
  typed in `src/env.d.ts`.

## Components & placement

```
electron/services/pty.service.ts   ← manages ptys (one per project: Map<projectId, IPty>)
electron/ipc/pty.ipc.ts            ← IPC handlers (registered in ipc/index.ts)

src/components/BottomPanel/        ← NEW: tab strip + collapsible/resizable region
  BottomPanel.tsx
  TerminalView/
    TerminalView.tsx               ← mounts xterm on a ref, wires it to the pty IPC
```

`EventConsole` (currently mounted in `App.tsx`) **moves into `BottomPanel`** as the
`Events` tab; `App.tsx` mounts `BottomPanel` instead. This makes `EventConsole` a
single-owner child of `BottomPanel` (per the placement convention).

## pty lifecycle

- **Lazy:** a project's pty is created on the first render of its terminal
  (`pty:create` with `cwd = project dir`), not before.
- **Persistent:** lives while the app runs; switching projects does NOT kill it
  (the user returns to the same scrollback).
- **Cleanup:** all ptys are killed on app `quit`, and a project's pty is killed
  when the project is removed.

## Native build setup

- Add `node-pty`; add an `electron-rebuild` postinstall step (rebuild against
  Electron 42's ABI); configure `electron-builder` to ship the native binary
  (`asarUnpack` for `node-pty`, `npmRebuild: true`).
- The build is no longer "zero native". The implementation plan has a dedicated
  native-setup task that verifies `electron-rebuild` + `npx electron-vite build`
  succeed and the app launches with a working pty.

## xterm setup

- `@xterm/addon-fit` for auto-resize to the panel size (required).
- xterm theme derived from the CSS-var design tokens (surface-0 background, text,
  accent) for the industrial-terminal look.
- No other addons in v1.

## Error handling

- pty `onExit` → show a "process exited (code N)" line with a restart button.
- If `node-pty` fails to load (native issue) → the Terminal tab shows a clear
  message instead of crashing the app.

## Testing

- `pty.service.ts` is testable in the main process: create a pty running a simple
  command (e.g. `echo hi`), assert the `onData` output, assert kill cleanup.
- The xterm UI is verified by build + manual check (xterm in jsdom is meaningless).
- Project gate: lint (0/0) + typecheck + `electron-vite build` + `electron-rebuild`.

## New dependencies

`node-pty` (main, native), `@xterm/xterm`, `@xterm/addon-fit` (renderer);
`@electron/rebuild` (dev) if not already available.

## Non-goals (v1)

Multiple terminals per project, scrollback persistence across app restarts,
search/web-links addons, split panes.
