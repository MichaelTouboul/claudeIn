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
  // BrowserWindow is unavailable outside a running Electron app (e.g. unit tests).
  if (!BrowserWindow?.getAllWindows) return;
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
