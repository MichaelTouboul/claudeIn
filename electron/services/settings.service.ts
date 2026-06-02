import fs from "fs";
import path from "path";
import { mergeLayers } from "./settings.merge";
import { broadcast } from "./broadcast";
import { SettingsSource } from "../types/settings.types";
import type { SettingsLayer, SettingsSnapshot } from "../types/settings.types";

/**
 * Settings service: reads the Claude Code settings layers from disk, merges them
 * (via the pure `mergeLayers`), and returns an in-RAM snapshot. Read-only — no
 * persistence to the DB.
 *
 * Layer model (4 layers, low → high precedence — official docs, code.claude.com):
 *   user         ~/.claude/settings.json
 *   project      <projectPath>/.claude/settings.json        (project scope only)
 *   projectLocal <projectPath>/.claude/settings.local.json  (project scope only)
 *   managed      /Library/Application Support/ClaudeCode/managed-settings.json (highest)
 *
 * There is NO `userLocal` layer. The managed dir is `ClaudeCode` (no space), under
 * the system `/Library`; it is normally absent on a non-MDM machine.
 *
 * HOME is resolved at call time (not module load) so tests can redirect the user
 * layer via `process.env.HOME`, mirroring `session.service.ts`.
 */

// Managed settings path on macOS. Read through a getter so it stays a single
// source of truth (and a future testability seam if it ever needs redirecting).
const MANAGED_SETTINGS_PATH =
  "/Library/Application Support/ClaudeCode/managed-settings.json";

interface LayerDescriptor {
  source: SettingsSource;
  path: string;
}

/**
 * Build the ordered (low → high precedence) list of layer descriptors for a scope.
 * Exported so tests can assert path/order without hitting disk.
 */
export function buildLayerPaths(projectPath?: string): LayerDescriptor[] {
  const HOME = process.env.HOME || require("os").homedir();
  const descriptors: LayerDescriptor[] = [
    {
      source: SettingsSource.User,
      path: path.join(HOME, ".claude", "settings.json"),
    },
  ];

  if (projectPath) {
    descriptors.push(
      {
        source: SettingsSource.Project,
        path: path.join(projectPath, ".claude", "settings.json"),
      },
      {
        source: SettingsSource.ProjectLocal,
        path: path.join(projectPath, ".claude", "settings.local.json"),
      },
    );
  }

  // Managed last so merge precedence puts it highest.
  descriptors.push({
    source: SettingsSource.Managed,
    path: MANAGED_SETTINGS_PATH,
  });

  return descriptors;
}

/**
 * Read a single layer from disk. Never throws (faithful-mirror rule):
 * - missing            → { exists: false, data: null }
 * - present + invalid   → { exists: true,  data: null, error: <message> }
 * - present + valid     → { exists: true,  data }
 */
function readLayer(descriptor: LayerDescriptor): SettingsLayer {
  let raw: string;
  try {
    raw = fs.readFileSync(descriptor.path, "utf-8");
  } catch {
    return {
      source: descriptor.source,
      path: descriptor.path,
      exists: false,
      data: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      source: descriptor.source,
      path: descriptor.path,
      exists: true,
      data: parsed,
    };
  } catch (err) {
    return {
      source: descriptor.source,
      path: descriptor.path,
      exists: true,
      data: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Read every layer fresh from disk and compute the snapshot. No caching here.
 * Synchronous: settings files are a few KB; IPC serializes the returned value.
 */
export function getSettings(projectPath?: string): SettingsSnapshot {
  const layers = buildLayerPaths(projectPath).map(readLayer);
  const { effective, provenance } = mergeLayers(layers);
  return {
    projectPath: projectPath ?? null,
    layers,
    effective,
    provenance,
  };
}

// --- Watch + debounced live broadcast --------------------------------------
//
// Watch the PARENT directories of every layer (~/.claude, the managed dir, and
// <projectPath>/.claude when project-scoped) rather than the files directly:
// editors save via write-then-rename, which a direct file watch misses. Each
// watcher filters its callback by the relevant filename(s) for that dir. On a
// matching change we debounce (~150ms, single trailing timer), recompute the
// snapshot, diff it against the last one (deep-equal on JSON.stringify), and
// broadcast `settings_changed` only when it actually changed. Mirrors the
// `fs.watch` + `watchers` Map idiom in `session.service.ts`. In-RAM only — the
// snapshot lives in a module-level variable and is NEVER persisted.

const DEBOUNCE_MS = 150;

// Active directory watchers, keyed by absolute dir path (mirrors session.service.ts).
const watchers = new Map<string, fs.FSWatcher>();
// The scope being watched (undefined = user/managed only). null when not watching.
let currentScope: string | undefined;
let isWatching = false;
// Last broadcast snapshot, serialized for cheap deep-equality. RAM only.
let lastSerialized: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

interface WatchTarget {
  dir: string;
  files: Set<string>;
}

/**
 * Group the layer descriptors for a scope by their parent directory, collecting
 * the set of filenames to match within each. Watching the dir (not the file)
 * survives editor write-then-rename saves.
 */
function buildWatchTargets(projectPath?: string): WatchTarget[] {
  const byDir = new Map<string, Set<string>>();
  for (const { path: filePath } of buildLayerPaths(projectPath)) {
    const dir = path.dirname(filePath);
    const files = byDir.get(dir) ?? new Set<string>();
    files.add(path.basename(filePath));
    byDir.set(dir, files);
  }
  return Array.from(byDir, ([dir, files]) => ({ dir, files }));
}

/** Debounced recompute → diff → broadcast on actual change. */
function scheduleRecompute(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const snapshot = getSettings(currentScope);
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    broadcast({ type: "settings_changed", snapshot });
  }, DEBOUNCE_MS);
}

/**
 * Start watching the layer directories for the given scope and broadcast a
 * recomputed snapshot whenever a watched settings file changes. Re-entrant:
 * a second call replaces any existing watch instead of double-watching.
 */
export function watchSettings(projectPath?: string): void {
  if (isWatching) unwatchSettings();

  currentScope = projectPath;
  isWatching = true;
  // Seed the baseline so the very first change diffs against the current state.
  lastSerialized = JSON.stringify(getSettings(currentScope));

  for (const { dir, files } of buildWatchTargets(projectPath)) {
    if (!fs.existsSync(dir)) continue; // missing dir → skip, never throw
    if (watchers.has(dir)) continue;
    try {
      const watcher = fs.watch(dir, (_event, filename) => {
        if (filename && !files.has(path.basename(filename))) return;
        scheduleRecompute();
      });
      watchers.set(dir, watcher);
    } catch {
      // Watching a dir can fail (perms, transient); skip it rather than throw.
    }
  }
}

/** Stop all watchers, clear the debounce timer, and reset the in-RAM snapshot. */
export function unwatchSettings(): void {
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
