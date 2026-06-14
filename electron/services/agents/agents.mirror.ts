import fs from "fs";
import os from "os";
import path from "path";
import matter from "gray-matter";
import { unionAgents } from "./agents.union";
import { broadcast } from "../core/broadcast";
import type { AgentFrontmatter } from "../../types/agent.types";
import type { AgentScope, AgentSummary, AgentsSnapshot } from "../../types/agents-mirror.types";

/**
 * Agents mirror service: reads the UNION of user (`~/.claude/agents`) and
 * project (`<projectPath>/.claude/agents`) agents into a lightweight
 * `AgentSummary[]`, watches both dirs recursively, and broadcasts
 * `agents_changed` whenever the snapshot changes.
 *
 * Additive & read-only — builds NEAR (not on top of) the existing
 * `agent.service.ts` / `project.service.getProjectAgents` readers. The
 * `findAgentsInDir`/`countMdFiles` behavior (recursive walk, skip `memory/`,
 * require frontmatter `name`, subAgents precedence) is REPLICATED here, not
 * called.
 *
 * HOME is resolved at call time (`process.env.HOME || os.homedir()`, like
 * `session.service.ts`) so tests can redirect the user scope via
 * `process.env.HOME`. The scan is synchronous (`fs.readFileSync` + `matter`),
 * consistent with the settings service; the IPC contract is `Promise<…>` only
 * because Electron wraps it.
 *
 * The summary is intentionally LIGHTWEIGHT: no body, no memory files, no annex
 * files. That heavy content stays on-demand via the existing `getAgent` IPC.
 * The body is parsed by `matter` solely to run `extractSubAgents`; it is never
 * stored on the summary.
 */

/** Resolve the user agents dir at call time (testable via process.env.HOME). */
function userAgentsDir(): string {
  const HOME = process.env.HOME || os.homedir();
  return path.join(HOME, ".claude", "agents");
}

/** Greps the body for `` `tw-…` `` backtick refs (replicates the reference readers). */
function extractSubAgents(body: string): string[] {
  const agents: string[] = [];
  const pattern = /`(tw-[\w-]+)`/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    if (!agents.includes(match[1])) agents.push(match[1]);
  }
  return agents;
}

/**
 * Recursively scan a single agents dir into lightweight summaries.
 * Replicates `findAgentsInDir`/`countMdFiles`: walk recursively, skip any
 * directory named `memory`, parse each `.md` via gray-matter, skip files with
 * no `data.name`. Never throws — a missing dir contributes an empty list and a
 * malformed/`name`-less file is skipped.
 */
function scanDir(root: string, scope: AgentScope): AgentSummary[] {
  if (!fs.existsSync(root)) return [];
  const summaries: AgentSummary[] = [];

  function walk(current: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "memory") continue; // heavy content, on-demand only
        walk(full);
      } else if (entry.name.endsWith(".md")) {
        try {
          const raw = fs.readFileSync(full, "utf-8");
          const { data, content } = matter(raw);
          if (!data.name) continue;

          const fm = data as AgentFrontmatter;
          const relativePath = path.relative(root, full);
          const folder = path.dirname(relativePath);

          summaries.push({
            id: fm.name,
            scope,
            filePath: full,
            relativePath,
            folder: folder === "." ? "" : folder,
            frontmatter: fm,
            subAgents:
              Array.isArray(fm.subAgents) && fm.subAgents.length > 0
                ? fm.subAgents
                : extractSubAgents(content),
            shadowed: false, // the union sets the real value
          });
        } catch {
          // malformed file → skip (faithful-mirror rule)
        }
      }
    }
  }

  walk(root);
  return summaries;
}

/**
 * Read the union of user + project agents fresh from disk. No caching here.
 * Never throws: a missing dir yields an empty list for that scope.
 */
export function getAgents(projectPath?: string): AgentsSnapshot {
  const userSummaries = scanDir(userAgentsDir(), "user");
  const projectSummaries = projectPath
    ? scanDir(path.join(projectPath, ".claude", "agents"), "project")
    : [];
  const agents = unionAgents(userSummaries, projectSummaries);
  return { projectPath: projectPath ?? null, agents };
}

// --- Watch + debounced live broadcast --------------------------------------
//
// Watch both agents dirs RECURSIVELY (`fs.watch(dir, { recursive: true })`) —
// agents nest in subfolders, so the non-recursive `session.service.ts` idiom
// would miss nested edits. Recursive `fs.watch` is supported on macOS (the
// target platform) and is confirmed by the nested-write test in
// agents.mirror.test.ts. Each callback filters to `.md` files (non-`.md` churn
// and `memory/` writes are ignored — and even if a `memory/` write slips
// through, the scan skips `memory/`, so the snapshot is unchanged and the diff
// guard suppresses the broadcast). On a matching change we debounce (~150ms,
// single trailing timer), recompute, diff against the last snapshot
// (JSON.stringify deep-equality), and `broadcast({ type: 'agents_changed',
// snapshot })` only when it actually changed. Mirrors the watch idiom in
// `settings.service.ts`. The snapshot is RAM-only and is NEVER persisted.

const DEBOUNCE_MS = 150;

// Active directory watchers, keyed by absolute dir path (mirrors settings.service.ts).
const watchers = new Map<string, fs.FSWatcher>();
// The scope being watched (undefined = user only). Reset on unwatch.
let currentScope: string | undefined;
let isWatching = false;
// Last broadcast snapshot, serialized for cheap deep-equality. RAM only.
let lastSerialized: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** The agents dirs to watch for the given scope. */
function watchDirs(projectPath?: string): string[] {
  const dirs = [userAgentsDir()];
  if (projectPath) dirs.push(path.join(projectPath, ".claude", "agents"));
  return dirs;
}

/** Debounced recompute → diff → broadcast on actual change. */
function scheduleRecompute(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const snapshot = getAgents(currentScope);
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    broadcast({ type: "agents_changed", snapshot });
  }, DEBOUNCE_MS);
}

/**
 * Start watching the agents dirs for the given scope and broadcast a recomputed
 * snapshot whenever a watched `.md` changes. Re-entrant: a second call replaces
 * any existing watch instead of double-watching.
 */
export function watchAgents(projectPath?: string): void {
  if (isWatching) unwatchAgents();

  currentScope = projectPath;
  isWatching = true;
  // Seed the baseline so the very first change diffs against the current state.
  lastSerialized = JSON.stringify(getAgents(currentScope));

  for (const dir of watchDirs(projectPath)) {
    if (!fs.existsSync(dir)) continue; // missing dir → skip, never throw
    if (watchers.has(dir)) continue;
    try {
      const watcher = fs.watch(dir, { recursive: true }, (_event, filename) => {
        if (filename && !filename.endsWith(".md")) return; // ignore non-.md churn
        scheduleRecompute();
      });
      watchers.set(dir, watcher);
    } catch {
      // Watching a dir can fail (perms, transient); skip it rather than throw.
    }
  }
}

/** Stop all watchers, clear the debounce timer, and reset the in-RAM snapshot. */
export function unwatchAgents(): void {
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
