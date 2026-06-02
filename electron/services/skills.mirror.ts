import fs from "fs";
import os from "os";
import path from "path";
import matter from "gray-matter";
import { unionSkills } from "./skills.union";
import { broadcast } from "./broadcast";
import type { SkillScope, SkillSummary, SkillsSnapshot } from "../types/skills-mirror.types";

/**
 * Skills mirror service: reads the UNION of user (`~/.claude/skills`) and
 * project (`<projectPath>/.claude/skills`) skills into a lightweight
 * `SkillSummary[]`, watches both dirs recursively, and broadcasts
 * `skills_changed` whenever the snapshot changes.
 *
 * Additive & read-only — builds NEAR (not on top of) the existing
 * `project.service.getProjectSkills` reader. The `findSkillsInDir`/`countSkills`
 * behavior (a skill UNIT is a top-level subdir containing `SKILL.md`, parsed via
 * gray-matter for `name`/`description`/`metadata`) is REPLICATED here, not
 * called.
 *
 * HOME is resolved at call time (`process.env.HOME || os.homedir()`, like
 * `agents.mirror.ts`) so tests can redirect the user scope via
 * `process.env.HOME`. The scan is synchronous (`fs.readFileSync` + `matter`),
 * consistent with the agents/settings services; the IPC contract is
 * `Promise<…>` only because Electron wraps it.
 *
 * The summary is intentionally LIGHTWEIGHT: no body, no annex-file contents.
 * That heavy content stays on-demand via the existing `getProjectSkills` reader.
 * The body is parsed by `matter` solely to compute `lineCount`; it is never
 * stored on the summary.
 */

/** Resolve the user skills dir at call time (testable via process.env.HOME). */
function userSkillsDir(): string {
  const HOME = process.env.HOME || os.homedir();
  return path.join(HOME, ".claude", "skills");
}

/**
 * Scan a single skills dir into lightweight summaries. Replicates
 * `findSkillsInDir`/`countSkills`: each top-level subdir containing a `SKILL.md`
 * is one skill; parse that file's frontmatter (`name` || dir name, description,
 * metadata) and compute `lineCount` from the body. Never throws — a missing dir
 * contributes an empty list and a malformed `SKILL.md` is skipped.
 */
function scanDir(root: string, scope: SkillScope): SkillSummary[] {
  if (!fs.existsSync(root)) return [];
  const summaries: SkillSummary[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(root, entry.name, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue; // dirs without SKILL.md are not skills

    try {
      const raw = fs.readFileSync(skillFile, "utf-8");
      const { data, content } = matter(raw);
      const body = content.trim();

      summaries.push({
        name: typeof data.name === "string" && data.name ? data.name : entry.name,
        description: typeof data.description === "string" ? data.description : "",
        scope,
        filePath: skillFile,
        metadata:
          data.metadata && typeof data.metadata === "object"
            ? (data.metadata as Record<string, unknown>)
            : undefined,
        lineCount: body.split("\n").length,
        shadowed: false, // the union sets the real value
      });
    } catch {
      // malformed SKILL.md → skip (faithful-mirror rule)
    }
  }

  return summaries;
}

/**
 * Read the union of user + project skills fresh from disk. No caching here.
 * Never throws: a missing dir yields an empty list for that scope.
 */
export function getSkillsMirror(projectPath?: string): SkillsSnapshot {
  const userSummaries = scanDir(userSkillsDir(), "user");
  const projectSummaries = projectPath
    ? scanDir(path.join(projectPath, ".claude", "skills"), "project")
    : [];
  const skills = unionSkills(userSummaries, projectSummaries);
  return { projectPath: projectPath ?? null, skills };
}

// --- Watch + debounced live broadcast --------------------------------------
//
// Watch both skills dirs RECURSIVELY (`fs.watch(dir, { recursive: true })`) —
// a skill is a folder, so SKILL.md edits live one level down and the
// non-recursive idiom would miss them. Recursive `fs.watch` is supported on
// macOS (the target platform). Each callback filters to changes touching a
// `SKILL.md` (other churn inside a skill folder — annex files — does not change
// the lightweight summary, and even if it slips through the diff guard
// suppresses the broadcast). On a matching change we debounce (~150ms, single
// trailing timer), recompute, diff against the last snapshot (JSON.stringify
// deep-equality), and `broadcast({ type: 'skills_changed', snapshot })` only
// when it actually changed. Mirrors the watch idiom in `agents.mirror.ts`. The
// snapshot is RAM-only and is NEVER persisted.

const DEBOUNCE_MS = 150;

// Active directory watchers, keyed by absolute dir path (mirrors agents.mirror.ts).
const watchers = new Map<string, fs.FSWatcher>();
// The scope being watched (undefined = user only). Reset on unwatch.
let currentScope: string | undefined;
let isWatching = false;
// Last broadcast snapshot, serialized for cheap deep-equality. RAM only.
let lastSerialized: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** The skills dirs to watch for the given scope. */
function watchDirs(projectPath?: string): string[] {
  const dirs = [userSkillsDir()];
  if (projectPath) dirs.push(path.join(projectPath, ".claude", "skills"));
  return dirs;
}

/** Debounced recompute → diff → broadcast on actual change. */
function scheduleRecompute(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const snapshot = getSkillsMirror(currentScope);
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    broadcast({ type: "skills_changed", snapshot });
  }, DEBOUNCE_MS);
}

/**
 * Start watching the skills dirs for the given scope and broadcast a recomputed
 * snapshot whenever a watched `SKILL.md` changes. Re-entrant: a second call
 * replaces any existing watch instead of double-watching.
 */
export function watchSkills(projectPath?: string): void {
  if (isWatching) unwatchSkills();

  currentScope = projectPath;
  isWatching = true;
  // Seed the baseline so the very first change diffs against the current state.
  lastSerialized = JSON.stringify(getSkillsMirror(currentScope));

  for (const dir of watchDirs(projectPath)) {
    if (!fs.existsSync(dir)) continue; // missing dir → skip, never throw
    if (watchers.has(dir)) continue;
    try {
      const watcher = fs.watch(dir, { recursive: true }, (_event, filename) => {
        // Only SKILL.md edits change the lightweight summary; ignore other churn.
        if (filename && !filename.endsWith("SKILL.md")) return;
        scheduleRecompute();
      });
      watchers.set(dir, watcher);
    } catch {
      // Watching a dir can fail (perms, transient); skip it rather than throw.
    }
  }
}

/** Stop all watchers, clear the debounce timer, and reset the in-RAM snapshot. */
export function unwatchSkills(): void {
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
