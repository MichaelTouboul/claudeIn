import fs from "fs";
import os from "os";
import path from "path";
import { broadcast } from "../core/broadcast";
import { getProjectsBase } from "../session/session.transcript";
import { PROJECT_SCAN_DEPTH, PROJECT_SKIP_DIRS } from "../projects/project.service";
import { detectImports, firstNonEmptyLine } from "./memory.summarize";
import type { MemoryEntry, MemorySnapshot, MemorySource } from "../../types/memory-mirror.types";

/**
 * Memory mirror service: reads the memory / context sources Claude Code loads —
 * the CLAUDE.md hierarchy (user + project root + project `.claude/` + nested)
 * plus the per-project auto-memory dir — into a lightweight `MemoryEntry[]`,
 * watches a bounded set of targets, and broadcasts `memory_changed` whenever the
 * snapshot changes.
 *
 * Additive & read-only — builds NEAR (not on top of) the existing
 * `memory.service.ts` reader and the `agent.service` memory CRUD; their
 * `memory:*` channels are untouched. The snapshot is LIGHTWEIGHT: per entry only
 * `size` (`fs.stat`), a `firstLine` preview, and a `hasImports` flag. Full file
 * content stays on-demand via the existing readers and is NEVER in the snapshot.
 *
 * HOME is resolved at call time (`process.env.HOME || os.homedir()`, like
 * `agents.mirror.ts` / `session.transcript.ts`) so tests redirect every scope via
 * `process.env.HOME`. The auto-memory base reuses `getProjectsBase()` and the
 * nested walk reuses `project.service`'s `PROJECT_SKIP_DIRS` + `PROJECT_SCAN_DEPTH`
 * — the same skip list / depth cap the project scanner uses — so neither is
 * re-derived. The scan is synchronous, consistent with the other mirror services.
 */

/** Resolve the user `~/.claude` dir at call time (testable via process.env.HOME). */
function userClaudeDir(): string {
  const HOME = process.env.HOME || os.homedir();
  return path.join(HOME, ".claude");
}

/**
 * The per-project auto-memory dir: `<projectsBase>/<encoded-project>/memory`.
 * Reuses `getProjectsBase()` (call-time HOME) for the base and matches the
 * `<encoded-project>` encoding `memory.service` uses (`/` → `-`, drop the
 * leading `-`). Returns null when there is no project.
 */
function autoMemoryDir(projectPath?: string): string | null {
  if (!projectPath) return null;
  const encoded = projectPath.replace(/\//g, "-").replace(/^-/, "");
  return path.join(getProjectsBase(), encoded, "memory");
}

/** Read just enough of a file to derive `firstLine` + `hasImports` (not stored). */
function buildEntry(filePath: string, source: MemorySource, scope: MemoryEntry["scope"]): MemoryEntry | null {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    const text = fs.readFileSync(filePath, "utf-8");
    return {
      source,
      path: filePath,
      scope,
      size: stat.size,
      firstLine: firstNonEmptyLine(text),
      hasImports: detectImports(text),
    };
  } catch {
    return null; // missing/corrupt → skip (faithful-mirror rule, never throws)
  }
}

/**
 * Bounded recursive walk for nested `CLAUDE.md` under the project. Reuses the
 * project scanner's skip list and depth cap (no node_modules/.git/dotdirs). The
 * project root + `<project>/.claude/CLAUDE.md` are handled separately and
 * excluded here to avoid duplicate entries.
 */
function findNestedClaudeMd(projectPath: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const rootClaude = path.join(projectPath, "CLAUDE.md");
  const dotClaude = path.join(projectPath, ".claude", "CLAUDE.md");

  function walk(dir: string, depth: number): void {
    if (depth > PROJECT_SCAN_DEPTH) return;
    let dirents: fs.Dirent[];
    try {
      dirents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const dirent of dirents) {
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        if (PROJECT_SKIP_DIRS.has(dirent.name)) continue;
        if (dirent.name.startsWith(".") && dirent.name !== ".claude") continue;
        walk(full, depth + 1);
      } else if (dirent.name === "CLAUDE.md") {
        if (full === rootClaude || full === dotClaude) continue; // counted as project, not nested
        const entry = buildEntry(full, "nested-claude-md", "project");
        if (entry) entries.push(entry);
      }
    }
  }

  walk(projectPath, 0);
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

/** Auto-memory `*.md` (incl. MEMORY.md) in the per-project memory dir. */
function findAutoMemory(projectPath?: string): MemoryEntry[] {
  const dir = autoMemoryDir(projectPath);
  if (!dir || !fs.existsSync(dir)) return [];
  let dirents: fs.Dirent[];
  try {
    dirents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const entries: MemoryEntry[] = [];
  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".md")) continue;
    const entry = buildEntry(path.join(dir, dirent.name), "auto-memory", "project");
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Read the memory hierarchy + auto-memory fresh from disk. No caching here.
 * Never throws: missing files/dirs are skipped. Stable order:
 * user → project (root, then `.claude/`) → nested (by path) → auto-memory (by path).
 */
export function getMemory(projectPath?: string): MemorySnapshot {
  const entries: MemoryEntry[] = [];

  // 1. user ~/.claude/CLAUDE.md
  const userEntry = buildEntry(path.join(userClaudeDir(), "CLAUDE.md"), "user-claude-md", "user");
  if (userEntry) entries.push(userEntry);

  if (projectPath) {
    // 2. project <project>/CLAUDE.md then <project>/.claude/CLAUDE.md
    const projectRoot = buildEntry(path.join(projectPath, "CLAUDE.md"), "project-claude-md", "project");
    if (projectRoot) entries.push(projectRoot);
    const projectDot = buildEntry(path.join(projectPath, ".claude", "CLAUDE.md"), "project-claude-md", "project");
    if (projectDot) entries.push(projectDot);

    // 3. nested CLAUDE.md (bounded walk)
    entries.push(...findNestedClaudeMd(projectPath));
  }

  // 4. auto-memory *.md
  entries.push(...findAutoMemory(projectPath));

  return { projectPath: projectPath ?? null, entries };
}

// --- Watch + debounced live broadcast --------------------------------------
//
// Watch a BOUNDED set of targets (never the whole project recursively):
//   - `~/.claude/`               (filter `CLAUDE.md`)
//   - `<project>/`               (filter `CLAUDE.md`)
//   - `<project>/.claude/`       (filter `CLAUDE.md`)
//   - `<projectsBase>/<enc>/memory/` (recursive — small, all `*.md`)
// On a matching change we debounce (~150ms, single trailing timer), recompute,
// diff against the last snapshot (JSON.stringify deep-equality), and
// `broadcast({ type: 'memory_changed', snapshot })` only when it actually
// changed. Mirrors the watch idiom in agents/skills.mirror. v1 limitation:
// deeply-nested CLAUDE.md edits below the watched roots only surface on the next
// getMemory, not live. The snapshot is RAM-only and is NEVER persisted.

const DEBOUNCE_MS = 150;

interface WatchTarget {
  dir: string;
  recursive: boolean;
  /** Filter filenames that should trigger a recompute. */
  matches: (filename: string) => boolean;
}

const watchers = new Map<string, fs.FSWatcher>();
let currentScope: string | undefined;
let isWatching = false;
let lastSerialized: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** The bounded watch targets for the given scope. */
function watchTargets(projectPath?: string): WatchTarget[] {
  const isClaudeMd = (filename: string): boolean => filename.endsWith("CLAUDE.md");
  const targets: WatchTarget[] = [
    { dir: userClaudeDir(), recursive: false, matches: isClaudeMd },
  ];
  if (projectPath) {
    targets.push({ dir: projectPath, recursive: false, matches: isClaudeMd });
    targets.push({ dir: path.join(projectPath, ".claude"), recursive: false, matches: isClaudeMd });
  }
  const memDir = autoMemoryDir(projectPath);
  if (memDir) {
    targets.push({ dir: memDir, recursive: true, matches: (f) => f.endsWith(".md") });
  }
  return targets;
}

/** Debounced recompute → diff → broadcast on actual change. */
function scheduleRecompute(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const snapshot = getMemory(currentScope);
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    broadcast({ type: "memory_changed", snapshot });
  }, DEBOUNCE_MS);
}

/**
 * Start watching the bounded memory targets for the given scope and broadcast a
 * recomputed snapshot whenever a watched file changes. Re-entrant: a second call
 * replaces any existing watch instead of double-watching.
 */
export function watchMemory(projectPath?: string): void {
  if (isWatching) unwatchMemory();

  currentScope = projectPath;
  isWatching = true;
  lastSerialized = JSON.stringify(getMemory(currentScope));

  for (const target of watchTargets(projectPath)) {
    if (!fs.existsSync(target.dir)) continue; // missing dir → skip, never throw
    if (watchers.has(target.dir)) continue;
    try {
      const watcher = fs.watch(target.dir, { recursive: target.recursive }, (_event, filename) => {
        if (filename && !target.matches(filename)) return;
        scheduleRecompute();
      });
      watchers.set(target.dir, watcher);
    } catch {
      // Watching a dir can fail (perms, transient); skip it rather than throw.
    }
  }
}

/** Stop all watchers, clear the debounce timer, and reset the in-RAM snapshot. */
export function unwatchMemory(): void {
  for (const watcher of watchers.values()) watcher.close();
  watchers.clear();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  currentScope = undefined;
  isWatching = false;
  lastSerialized = null;
}
