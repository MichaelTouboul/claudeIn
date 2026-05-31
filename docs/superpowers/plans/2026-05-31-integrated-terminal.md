# Integrated Terminal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a VS Code-style interactive terminal (`xterm.js` + `node-pty`) in a tabbed bottom panel (Terminal + Events), one pty per project.

**Architecture:** `node-pty` runs in the Electron main process (one pty per project path, with an output buffer for scrollback replay); the renderer shows `xterm.js` and talks to it over IPC (`pty:create/write/resize/kill` + a `pty:data` push). The existing `EventConsole` moves into the new `BottomPanel` as the Events tab.

**Tech Stack:** Electron 42, `node-pty` (native), `@xterm/xterm` + `@xterm/addon-fit`, `@electron/rebuild`, React 19, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-31-integrated-terminal-design.md`

**⚠️ Prerequisite:** The block-system skeleton (which adds Vitest) must be merged first — Task 2's service test needs it. Verify with `grep -c '"vitest"' package.json` ≥ 1.

**Verification:** per task — `npm run typecheck` (0), `npm run lint:fix && npm run lint` (0/0), relevant Vitest tests, and `npx electron-vite build`. The pty itself is verified by Task 2's node test + a manual launch (Task 7).

**Convention:** `projectPath` is used as BOTH the pty key and the cwd (it is unique). The renderer never touches Node — only `window.api` + xterm.

---

## File structure

```
electron/services/pty.service.ts   ← Map<projectPath, {pty, buffer}>; create/attach + write/resize/kill/killAll; streams pty:data
electron/ipc/pty.ipc.ts            ← IPC handlers (registered in ipc/index.ts)
src/components/BottomPanel/
  BottomPanel.tsx                  ← tab strip (Terminal | Events), collapsible, resizable height
  TerminalView/TerminalView.tsx    ← xterm mounted on a ref, wired to the pty IPC
```

Modified: `package.json`, `electron/ipc/index.ts`, `electron/preload.ts`, `electron/main.ts`, `src/env.d.ts`, `src/App.tsx`.

---

## Task 1: Native deps + electron-rebuild + packaging

**Files:** Modify `package.json`

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install node-pty @xterm/xterm @xterm/addon-fit
npm install -D @electron/rebuild
```

- [ ] **Step 2: Rebuild node-pty against Electron's ABI**

Run: `npx electron-rebuild -f -w node-pty`
Expected: "Rebuild Complete" with no errors.

- [ ] **Step 3: Add a postinstall rebuild + packaging config to `package.json`**

Add to `"scripts"`:
```json
"postinstall": "electron-rebuild -f -w node-pty"
```
In the `electron-builder` config (the `"build"` key; create it if absent), ensure native unpacking:
```json
"build": {
  "npmRebuild": true,
  "asarUnpack": ["**/node_modules/node-pty/**"]
}
```
(Merge into any existing `"build"` block rather than overwriting it.)

- [ ] **Step 4: Smoke-test that node-pty loads in Node**

Run:
```bash
node -e "const pty=require('node-pty'); const p=pty.spawn(process.env.SHELL||'/bin/sh',['-c','printf OK'],{cwd:process.cwd()}); p.onData(d=>{if(d.includes('OK')){console.log('PTY_OK');process.exit(0)}}); setTimeout(()=>process.exit(1),3000)"
```
Expected: prints `PTY_OK`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(deps): node-pty + xterm + electron-rebuild for the terminal"
```

---

## Task 2: pty.service.ts

**Files:**
- Create: `electron/services/pty.service.test.ts`
- Create: `electron/services/pty.service.ts`

- [ ] **Step 1: Write the failing test** (runs in the Node env, not jsdom)

```ts
// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';

import { killAll, write, createOrAttach, listProjects } from './pty.service';

afterEach(() => killAll());

function waitFor(predicate: () => boolean, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('timeout'));
      setTimeout(tick, 20);
    };
    tick();
  });
}

describe('pty.service', () => {
  it('spawns a pty for a project and captures its output via the onData sink', async () => {
    const chunks: string[] = [];
    createOrAttach('/tmp', process.cwd(), 80, 24, (data) => chunks.push(data));
    write('/tmp', "printf TERMOK\r");
    await waitFor(() => chunks.join('').includes('TERMOK'));
    expect(chunks.join('')).toContain('TERMOK');
    expect(listProjects()).toContain('/tmp');
  });

  it('killAll removes every pty', () => {
    createOrAttach('/tmp', process.cwd(), 80, 24, () => {});
    expect(listProjects().length).toBeGreaterThan(0);
    killAll();
    expect(listProjects()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- pty.service`
Expected: FAIL — cannot find `./pty.service`.

- [ ] **Step 3: Implement the service**

```ts
import { BrowserWindow } from 'electron';
import * as pty from 'node-pty';

type Entry = { proc: pty.IPty; buffer: string };

const sessions = new Map<string, Entry>();
const BUFFER_CAP = 64_000;

function defaultShell(): string {
  if (process.platform === 'win32') return process.env.COMSPEC || 'powershell.exe';
  return process.env.SHELL || '/bin/zsh';
}

function send(projectPath: string, data: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('pty:data', { projectPath, data });
  }
}

/** Create the pty for a project (cwd=projectPath) or, if it exists, replay its buffer.
 *  `sink` is optional and used by tests; production streaming goes through `send`. */
export function createOrAttach(
  projectPath: string,
  cwd: string,
  cols: number,
  rows: number,
  sink?: (data: string) => void
): void {
  const existing = sessions.get(projectPath);
  if (existing) {
    send(projectPath, existing.buffer);
    sink?.(existing.buffer);
    return;
  }
  const proc = pty.spawn(defaultShell(), [], {
    name: 'xterm-color',
    cols,
    rows,
    cwd,
    env: { ...process.env },
  });
  const entry: Entry = { proc, buffer: '' };
  sessions.set(projectPath, entry);
  proc.onData((data) => {
    entry.buffer = (entry.buffer + data).slice(-BUFFER_CAP);
    send(projectPath, data);
    sink?.(data);
  });
  proc.onExit(({ exitCode }) => {
    send(projectPath, `\r\n[process exited (${exitCode})]\r\n`);
    sessions.delete(projectPath);
  });
}

export function write(projectPath: string, data: string): void {
  sessions.get(projectPath)?.proc.write(data);
}

export function resize(projectPath: string, cols: number, rows: number): void {
  sessions.get(projectPath)?.proc.resize(cols, rows);
}

export function kill(projectPath: string): void {
  const entry = sessions.get(projectPath);
  if (!entry) return;
  entry.proc.kill();
  sessions.delete(projectPath);
}

export function killAll(): void {
  for (const { proc } of sessions.values()) proc.kill();
  sessions.clear();
}

export function listProjects(): string[] {
  return [...sessions.keys()];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- pty.service`
Expected: PASS (2 tests). (Requires node-pty built from Task 1.)

- [ ] **Step 5: Commit**

```bash
git add electron/services/pty.service.ts electron/services/pty.service.test.ts
git commit -m "feat(pty): per-project pty service with scrollback buffer"
```

---

## Task 3: pty IPC handlers

**Files:**
- Create: `electron/ipc/pty.ipc.ts`
- Modify: `electron/ipc/index.ts`

- [ ] **Step 1: Implement the handlers**

```ts
import { ipcMain } from 'electron';

import * as ptyService from '../services/pty.service';

export function registerPtyHandlers(): void {
  ipcMain.handle('pty:create', (_e, projectPath: string, cwd: string, cols: number, rows: number) => {
    ptyService.createOrAttach(projectPath, cwd, cols, rows);
  });
  ipcMain.on('pty:write', (_e, projectPath: string, data: string) => ptyService.write(projectPath, data));
  ipcMain.on('pty:resize', (_e, projectPath: string, cols: number, rows: number) => ptyService.resize(projectPath, cols, rows));
  ipcMain.on('pty:kill', (_e, projectPath: string) => ptyService.kill(projectPath));
}
```

- [ ] **Step 2: Register in `electron/ipc/index.ts`**

Add the import next to the others:
```ts
import { registerPtyHandlers } from "./pty.ipc";
```
Add the call inside `registerAllHandlers()`:
```ts
  registerPtyHandlers();
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck` → 0 errors.

- [ ] **Step 4: Commit**

```bash
git add electron/ipc/pty.ipc.ts electron/ipc/index.ts
git commit -m "feat(pty): IPC handlers (create/write/resize/kill)"
```

---

## Task 4: preload + env.d.ts contract

**Files:**
- Modify: `electron/preload.ts`
- Modify: `src/env.d.ts`

- [ ] **Step 1: Expose the pty API in `electron/preload.ts`**

Add these inside the `exposeInMainWorld("api", { ... })` object:
```ts
  ptyCreate: (projectPath: string, cwd: string, cols: number, rows: number) =>
    ipcRenderer.invoke("pty:create", projectPath, cwd, cols, rows),
  ptyWrite: (projectPath: string, data: string) => ipcRenderer.send("pty:write", projectPath, data),
  ptyResize: (projectPath: string, cols: number, rows: number) => ipcRenderer.send("pty:resize", projectPath, cols, rows),
  ptyKill: (projectPath: string) => ipcRenderer.send("pty:kill", projectPath),
  onPtyData: (cb: (p: { projectPath: string; data: string }) => void) => {
    const handler = (_e: unknown, p: { projectPath: string; data: string }) => cb(p);
    ipcRenderer.on("pty:data", handler);
    return () => { ipcRenderer.removeListener("pty:data", handler); };
  },
```

- [ ] **Step 2: Type them in `src/env.d.ts`** (inside the `window.api` interface)

```ts
    ptyCreate: (projectPath: string, cwd: string, cols: number, rows: number) => Promise<void>;
    ptyWrite: (projectPath: string, data: string) => void;
    ptyResize: (projectPath: string, cols: number, rows: number) => void;
    ptyKill: (projectPath: string) => void;
    onPtyData: (cb: (p: { projectPath: string; data: string }) => void) => () => void;
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck` → 0 errors.

- [ ] **Step 4: Commit**

```bash
git add electron/preload.ts src/env.d.ts
git commit -m "feat(pty): window.api pty surface (preload + types)"
```

---

## Task 5: TerminalView (xterm wired to IPC)

**Files:** Create `src/components/BottomPanel/TerminalView/TerminalView.tsx`

- [ ] **Step 1: Implement TerminalView**

```tsx
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { useEffect, useRef } from 'react';

import '@xterm/xterm/css/xterm.css';

export type TerminalViewProps = { projectPath: string };

export function TerminalView({ projectPath }: TerminalViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const term = new Terminal({
      fontFamily: 'var(--font-mono), monospace',
      fontSize: 12,
      cursorBlink: true,
      theme: { background: '#06080c', foreground: '#e2e8f0', cursor: '#06b6d4' },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();

    void window.api.ptyCreate(projectPath, projectPath, term.cols, term.rows);
    const offData = window.api.onPtyData((p) => {
      if (p.projectPath === projectPath) term.write(p.data);
    });
    const inputSub = term.onData((data) => window.api.ptyWrite(projectPath, data));

    const onResize = () => {
      fit.fit();
      window.api.ptyResize(projectPath, term.cols, term.rows);
    };
    window.addEventListener('resize', onResize);

    return () => {
      offData();
      inputSub.dispose();
      window.removeEventListener('resize', onResize);
      term.dispose();
    };
  }, [projectPath]);

  return <div ref={hostRef} className="h-full w-full" style={{ background: 'var(--color-surface-0)' }} />;
}
```

Note: the theme `background`/`foreground`/`cursor` must be concrete hex (xterm cannot read CSS vars); these mirror `--color-surface-0`, `--color-text-primary`, `--color-accent`. Keep them in sync with `src/index.css`.

- [ ] **Step 2: Verify typecheck + lint + build**

Run: `npm run typecheck` → 0. `npm run lint:fix && npm run lint` → 0/0. `npx electron-vite build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/BottomPanel/TerminalView/TerminalView.tsx
git commit -m "feat(terminal): TerminalView (xterm wired to the pty IPC)"
```

---

## Task 6: BottomPanel (tabbed shell)

**Files:** Create `src/components/BottomPanel/BottomPanel.tsx`

- [ ] **Step 1: Implement BottomPanel**

```tsx
import { ChevronDown, ChevronUp, Terminal as TerminalIcon, Activity } from 'lucide-react';
import { useState } from 'react';

import { EventConsole } from '@/components/EventConsole/EventConsole';
import type { LiveEvent } from '@/types/events.types';

import { TerminalView } from './TerminalView/TerminalView';

type Tab = 'terminal' | 'events';

export type BottomPanelProps = {
  events: LiveEvent[];
  agentColorMap: Map<string, string>;
  projectPath: string | null;
};

export function BottomPanel({ events, agentColorMap, projectPath }: BottomPanelProps) {
  const [tab, setTab] = useState<Tab>('terminal');
  const [expanded, setExpanded] = useState(true);

  const tabBtn = (id: Tab, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => { setTab(id); setExpanded(true); }}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
      style={{
        color: tab === id ? 'var(--color-accent)' : 'var(--color-text-muted)',
        borderBottom: tab === id ? '2px solid var(--color-accent)' : '2px solid transparent',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {icon}{label}
    </button>
  );

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-0)', height: expanded ? '15rem' : '2.25rem' }}>
      <div className="flex items-center" style={{ background: 'var(--color-surface-1)' }}>
        {tabBtn('terminal', 'Terminal', <TerminalIcon size={12} />)}
        {tabBtn('events', `Events (${events.length})`, <Activity size={12} />)}
        <button onClick={() => setExpanded((v) => !v)} className="ml-auto px-3 py-2" style={{ color: 'var(--color-text-muted)' }} title={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>
      {expanded ? (
        <div style={{ height: 'calc(100% - 36px)' }}>
          {tab === 'terminal' ? (
            projectPath ? <TerminalView key={projectPath} projectPath={projectPath} /> : <p className="p-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>Select a project to open a terminal.</p>
          ) : (
            <EventConsole events={events} agentColorMap={agentColorMap} />
          )}
        </div>
      ) : null}
    </div>
  );
}
```

Note: `EventConsole` currently renders its own collapse header + fixed height. Since `BottomPanel` now owns the collapse + height, simplify `EventConsole` to render only its scrollable event list (remove its outer `height`/`borderTop` wrapper and its expand button) so it fills the panel body. Apply that trim in this task.

- [ ] **Step 2: Trim EventConsole to be a panel body**

In `src/components/EventConsole/EventConsole.tsx`, remove the outer height/border wrapper and the expand toggle button; keep the scrollable list (`<div ref={scrollRef} ...>`) as the root, filling `height: 100%`. Keep the `events`/`agentColorMap` props.

- [ ] **Step 3: Verify typecheck + lint + build**

Run: `npm run typecheck` → 0. `npm run lint:fix && npm run lint` → 0/0. `npx electron-vite build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomPanel/BottomPanel.tsx src/components/EventConsole/EventConsole.tsx
git commit -m "feat(terminal): tabbed BottomPanel (Terminal + Events)"
```

---

## Task 7: App integration + quit cleanup

**Files:**
- Modify: `src/App.tsx`
- Modify: `electron/main.ts`

- [ ] **Step 1: Mount BottomPanel in `src/App.tsx`**

Replace the import:
```tsx
import { BottomPanel } from "@/components/BottomPanel/BottomPanel";
```
(remove the old `import { EventConsole } ...`).
Replace the `<EventConsole events={events} agentColorMap={agentColorMap} />` usage with:
```tsx
<BottomPanel events={events} agentColorMap={agentColorMap} projectPath={selectedProjectPath} />
```
Use the variable App already holds for the currently-selected project's path. If App tracks the selected project object, pass its `.path` (the value used as cwd elsewhere). If none is selected, pass `null`.

- [ ] **Step 2: Kill all ptys on quit in `electron/main.ts`**

Add the import:
```ts
import { killAll } from "./services/pty.service";
```
Register a quit hook (near the other `app.on(...)` handlers):
```ts
app.on("will-quit", () => killAll());
```

- [ ] **Step 3: Verify the full gate**

Run: `npm run typecheck` → 0. `npm run lint:fix && npm run lint` → 0/0. `npm run test` → all green. `npx electron-vite build` → succeeds.

- [ ] **Step 4: Manual check**

Run `npm run dev` (or the built app). With a project selected:
- The bottom panel shows a **Terminal** tab with a live shell in the project directory; type `ls` + Enter → output appears.
- Switch to **Events** → the old event log; switch back → the terminal scrollback is preserved.
- Resize the window → the terminal reflows.
- Quit the app → no orphaned shell processes remain (`ps` shows none).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx electron/main.ts
git commit -m "feat(terminal): mount BottomPanel + kill ptys on quit"
```

---

## Follow-ups (post-v1)

- Multiple terminals per project (tabs within the Terminal tab).
- Scrollback persistence across app restarts.
- `@xterm/addon-web-links` + search addon.
- Kill a project's pty when the project is removed from the app.
