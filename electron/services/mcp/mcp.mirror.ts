import fs from "fs";
import os from "os";
import path from "path";
import { broadcast } from "../core/broadcast";
import {
  reconcileMcp,
  type RawServerConfig,
  type SourceContribution,
} from "./mcp.reconcile";
import type { McpSnapshot } from "../../types/mcp-mirror.types";

/**
 * MCP mirror service: reconciles the `mcpServers` config scattered across the
 * local Claude Code config files into one lightweight `McpServerEntry[]` per
 * scope, watches the parent dirs of those files, and broadcasts `mcp_changed`
 * whenever the reconciled snapshot changes.
 *
 * STATIC config only — what MCP servers are configured and from where, NOT their
 * live connection/auth status (that needs connecting to each server). All four
 * sources are local files, read fresh on every `getMcp`; nothing is persisted.
 *
 * Additive & read-only — MCP config was not read at all before this mirror.
 *
 * HOME is resolved at call time (`process.env.HOME || os.homedir()`, like
 * `agents.mirror.ts`) so tests can redirect the user scope via
 * `process.env.HOME`. Reads are synchronous (`fs.readFileSync` + `JSON.parse`);
 * the IPC contract is `Promise<…>` only because Electron wraps it.
 *
 * `~/.claude.json` is large (~70 KB). It is read once and ONLY its `mcpServers`
 * and `projects[<projectPath>].mcpServers` keys are pulled out; the rest of the
 * file (history, project state, …) never enters the snapshot.
 */

/** Resolve the user HOME at call time (testable via process.env.HOME). */
function home(): string {
  return process.env.HOME || os.homedir();
}

/** Parse a JSON file into an object; missing/invalid/non-object → null (never throws). */
function readJsonObject(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // missing/unreadable/invalid JSON → contributes nothing (faithful-mirror rule)
  }
  return null;
}

/** Extract a `name → rawConfig` map from an arbitrary value (non-object → {}). */
function asServerMap(value: unknown): Record<string, RawServerConfig> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, RawServerConfig> = {};
  for (const [name, config] of Object.entries(value as Record<string, unknown>)) {
    if (config !== null && typeof config === "object" && !Array.isArray(config)) {
      out[name] = config as RawServerConfig;
    }
  }
  return out;
}

/** `mcpServers` from a parsed config object, or top-level map fallback for `.mcp.json`. */
function pullMcpServers(
  obj: Record<string, unknown> | null,
  topLevelFallback = false,
): Record<string, RawServerConfig> {
  if (!obj) return {};
  if ("mcpServers" in obj) return asServerMap(obj.mcpServers);
  // `.mcp.json` may be a bare `name → config` map with no `mcpServers` wrapper.
  return topLevelFallback ? asServerMap(obj) : {};
}

/**
 * Pull ONLY `mcpServers` (top-level) and `projects[projectPath].mcpServers` from
 * the big `~/.claude.json`, merged into a single user-global map. The per-project
 * entries (Claude Code's local store) take precedence over the top-level ones
 * within this single source. The rest of the 70 KB file is discarded here.
 */
function pullUserGlobal(
  obj: Record<string, unknown> | null,
  projectPath?: string,
): Record<string, RawServerConfig> {
  if (!obj) return {};
  const topLevel = asServerMap(obj.mcpServers);
  if (!projectPath) return topLevel;

  const projects = obj.projects;
  if (projects === null || typeof projects !== "object" || Array.isArray(projects)) {
    return topLevel;
  }
  const projectEntry = (projects as Record<string, unknown>)[projectPath];
  if (projectEntry === null || typeof projectEntry !== "object") return topLevel;
  const projectServers = asServerMap((projectEntry as Record<string, unknown>).mcpServers);
  return { ...topLevel, ...projectServers };
}

// --- Source file paths (resolved at call time) -----------------------------

function userSettingsPath(): string {
  return path.join(home(), ".claude", "settings.json");
}
function userGlobalPath(): string {
  return path.join(home(), ".claude.json");
}
function projectMcpJsonPath(projectPath: string): string {
  return path.join(projectPath, ".mcp.json");
}
function projectSettingsPath(projectPath: string): string {
  return path.join(projectPath, ".claude", "settings.json");
}

/** Build the per-source contributions for a scope (each read never throws). */
function readContributions(projectPath?: string): SourceContribution[] {
  const contributions: SourceContribution[] = [
    {
      source: "user-settings",
      scope: "user",
      servers: pullMcpServers(readJsonObject(userSettingsPath())),
    },
    {
      source: "user-global",
      scope: "user",
      servers: pullUserGlobal(readJsonObject(userGlobalPath()), projectPath),
    },
  ];

  if (projectPath) {
    contributions.push(
      {
        source: "project-mcp-json",
        scope: "project",
        servers: pullMcpServers(readJsonObject(projectMcpJsonPath(projectPath)), true),
      },
      {
        source: "project-settings",
        scope: "project",
        servers: pullMcpServers(readJsonObject(projectSettingsPath(projectPath))),
      },
    );
  }

  return contributions;
}

/**
 * Read every source fresh, reconcile by name with the locked precedence, and
 * return a stable, shadowing-resolved snapshot. Never throws.
 */
export function getMcp(projectPath?: string): McpSnapshot {
  const servers = reconcileMcp(readContributions(projectPath));
  return { projectPath: projectPath ?? null, servers };
}

// --- Watch + debounced live broadcast --------------------------------------
//
// Watch the PARENT dir of each source file (fs.watch on a file is unreliable on
// some platforms) with a tight filename filter, so we only react to the four
// files we care about:
//   ~/.claude/           → settings.json
//   $HOME (non-recursive) → .claude.json   (the big file; filter is strict)
//   <projectPath>/        → .mcp.json
//   <projectPath>/.claude → settings.json
// On a matching change we debounce (~150ms, single trailing timer), recompute,
// diff against the last snapshot (JSON.stringify deep-equality), and broadcast
// `mcp_changed` only when it actually changed. RAM-only; never persisted.

const DEBOUNCE_MS = 150;

interface WatchTarget {
  dir: string;
  file: string; // exact filename within `dir` to react to
}

const watchers = new Map<string, fs.FSWatcher>(); // keyed by dir
let currentScope: string | undefined;
let isWatching = false;
let lastSerialized: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** The (dir, filename-filter) pairs to watch for the given scope. */
function watchTargets(projectPath?: string): WatchTarget[] {
  const targets: WatchTarget[] = [
    { dir: path.join(home(), ".claude"), file: "settings.json" },
    { dir: home(), file: ".claude.json" },
  ];
  if (projectPath) {
    targets.push(
      { dir: projectPath, file: ".mcp.json" },
      { dir: path.join(projectPath, ".claude"), file: "settings.json" },
    );
  }
  return targets;
}

/** Debounced recompute → diff → broadcast on actual change. */
function scheduleRecompute(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const snapshot = getMcp(currentScope);
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    broadcast({ type: "mcp_changed", snapshot });
  }, DEBOUNCE_MS);
}

/**
 * Start watching the four MCP config sources for the given scope and broadcast a
 * recomputed snapshot whenever one of them changes. Re-entrant: a second call
 * replaces any existing watch instead of double-watching.
 */
export function watchMcp(projectPath?: string): void {
  if (isWatching) unwatchMcp();

  currentScope = projectPath;
  isWatching = true;
  // Seed the baseline so the very first change diffs against the current state.
  lastSerialized = JSON.stringify(getMcp(currentScope));

  for (const { dir, file } of watchTargets(projectPath)) {
    if (watchers.has(dir)) continue; // a dir may host two targets ($HOME never does)
    if (!fs.existsSync(dir)) continue; // missing dir → skip, never throw
    try {
      // Non-recursive: each target file sits directly in `dir` ($HOME watched
      // non-recursively, filtered strictly to `.claude.json`, avoids the noise).
      const watcher = fs.watch(dir, (_event, filename) => {
        if (filename && filename !== file) return; // ignore unrelated churn
        scheduleRecompute();
      });
      watchers.set(dir, watcher);
    } catch {
      // Watching a dir can fail (perms, transient); skip it rather than throw.
    }
  }
}

/** Stop all watchers, clear the debounce timer, and reset the in-RAM snapshot. */
export function unwatchMcp(): void {
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
