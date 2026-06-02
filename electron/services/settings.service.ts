import fs from "fs";
import path from "path";
import { mergeLayers } from "./settings.merge";
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

// --- Phase 3 (deferred): watch + broadcast live push -----------------------
//
// `watchSettings(projectPath?)` / `unwatchSettings()` will live here. They will
// watch the PARENT directories (~/.claude, the managed dir, <projectPath>/.claude),
// filter by filename, debounce (~150ms), recompute via getSettings(), diff against
// a module-level last snapshot, and broadcast({ type: 'settings_changed', snapshot })
// only on actual change. Mirrors session.service.ts's watch idiom. Not implemented
// in Phase 2.
// ---------------------------------------------------------------------------
