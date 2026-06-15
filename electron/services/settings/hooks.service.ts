import fs from "node:fs";
import { getSettings } from "./settings.service";
import { flattenLayers } from "./hooks.parse";
import {
  disabledIds,
  getDisabled,
  listDisabled,
  recordDisabled,
  removeDisabled,
} from "./hooks.store";
import { broadcast } from "../core/broadcast";
import { SettingsSource } from "../../types/settings.types";
import type { HookEntry } from "../../types/hooks.types";
import type { DisabledHookRow } from "./hooks.store";

/**
 * Hooks service — the Customize ecosystem editor's read + safe-toggle backend.
 *
 * READ (`getHooks`): flatten the settings layers (reusing the pure parser) into
 * normalized `HookEntry[]`, folding in the DB's disabled rows so disabled hooks
 * still surface (with `enabled:false`) even though they're no longer in any file.
 *
 * WRITE (`setHookEnabled`): SAFE, reversible. Disable removes exactly one
 * `{ type, command }` leaf from its layer's settings.json (pruning emptied
 * groups/events), records it verbatim in `disabled_hooks`, and writes the file
 * atomically. Enable re-inserts the stored leaf and forgets the row. Managed
 * (read-only) layers are never written. Every mutation re-broadcasts the fresh
 * settings snapshot so the UI refreshes through the existing `settings_changed`.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read + JSON-parse a settings file, or `{}` if missing/invalid. */
function readSettingsFile(filePath: string): Record<string, unknown> {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Atomic write: write to a temp sibling then rename over the target. */
function writeSettingsFile(filePath: string, data: Record<string, unknown>): void {
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  fs.renameSync(tmp, filePath);
}

/**
 * Normalize a settings object's `hooks` into the `{ event: group[] }` shape we
 * mutate. Returns the live (mutable) object reference inside `data` when present,
 * creating one when absent.
 */
function ensureHooks(data: Record<string, unknown>): Record<string, unknown[]> {
  if (!isRecord(data.hooks)) data.hooks = {};
  return data.hooks as Record<string, unknown[]>;
}

/**
 * The current, normalized list of hooks. Layers come from `getSettings`; disabled
 * rows are folded in so a disabled hook (absent from every file) still appears.
 */
export function getHooks(projectPath?: string): HookEntry[] {
  const snapshot = getSettings(projectPath);
  const fromFiles = flattenLayers(snapshot.layers);
  const disabled = disabledIds();

  // Mark live entries whose id is recorded as disabled (defensive: normally a
  // disabled hook is absent from files, but a manual re-add could resurrect it).
  const entries: HookEntry[] = fromFiles.map((e) =>
    disabled.has(e.id) ? { ...e, enabled: false } : e,
  );

  // Surface disabled hooks that are no longer present in any layer file.
  const present = new Set(entries.map((e) => e.id));
  for (const row of listDisabled()) {
    if (present.has(row.id)) continue;
    entries.push(disabledRowToEntry(row));
  }

  return entries;
}

function disabledRowToEntry(row: DisabledHookRow): HookEntry {
  return {
    id: row.id,
    event: row.event,
    matcher: row.matcher,
    command: row.command,
    source: row.scope,
    sourcePath: row.layerPath,
    enabled: false,
    editable: row.scope !== SettingsSource.Managed,
  };
}

/** Remove the one matching `{ type:"command", command }` leaf; prune emptied parents. */
function removeHookFromData(
  data: Record<string, unknown>,
  event: string,
  matcher: string | null,
  command: string,
): boolean {
  const hooks = data.hooks;
  if (!isRecord(hooks) || !Array.isArray(hooks[event])) return false;
  const groups = hooks[event] as unknown[];
  let removed = false;

  for (const group of groups) {
    if (!isRecord(group)) continue;
    const groupMatcher =
      typeof group.matcher === "string" && group.matcher.length > 0
        ? group.matcher
        : null;
    if (groupMatcher !== matcher) continue;
    if (!Array.isArray(group.hooks)) continue;

    const next = (group.hooks as unknown[]).filter(
      (h) => !(isRecord(h) && h.type === "command" && h.command === command),
    );
    if (next.length !== group.hooks.length) {
      removed = true;
      group.hooks = next;
    }
  }

  if (!removed) return false;

  // Prune now-empty `{ hooks: [] }` groups, then empty event arrays / object.
  const prunedGroups = groups.filter(
    (g) => !(isRecord(g) && Array.isArray(g.hooks) && g.hooks.length === 0),
  );
  if (prunedGroups.length === 0) {
    delete hooks[event];
  } else {
    hooks[event] = prunedGroups;
  }
  if (Object.keys(hooks).length === 0) delete data.hooks;

  return true;
}

/** Re-insert a leaf into the same event/matcher group (creating it if needed). */
function insertHookIntoData(
  data: Record<string, unknown>,
  event: string,
  matcher: string | null,
  command: string,
): void {
  const hooks = ensureHooks(data);
  if (!Array.isArray(hooks[event])) hooks[event] = [];
  const groups = hooks[event] as unknown[];

  const leaf = { type: "command", command };
  for (const group of groups) {
    if (!isRecord(group)) continue;
    const groupMatcher =
      typeof group.matcher === "string" && group.matcher.length > 0
        ? group.matcher
        : null;
    if (groupMatcher === matcher && Array.isArray(group.hooks)) {
      (group.hooks as unknown[]).push(leaf);
      return;
    }
  }

  const newGroup: Record<string, unknown> = { hooks: [leaf] };
  if (matcher !== null) newGroup.matcher = matcher;
  groups.push(newGroup);
}

function disable(entry: HookEntry, projectPath?: string): void {
  if (!entry.editable) {
    throw new Error(`Hook "${entry.id}" lives in a read-only (managed) layer`);
  }
  const data = readSettingsFile(entry.sourcePath);
  const removed = removeHookFromData(data, entry.event, entry.matcher, entry.command);
  if (removed) writeSettingsFile(entry.sourcePath, data);

  recordDisabled({
    id: entry.id,
    scope: entry.source,
    event: entry.event,
    matcher: entry.matcher,
    command: entry.command,
    layerPath: entry.sourcePath,
  });
  rebroadcast(projectPath);
}

function enable(id: string, projectPath?: string): void {
  const row = getDisabled(id);
  if (!row) return; // already enabled / never recorded → no-op
  if (row.scope === SettingsSource.Managed) {
    throw new Error(`Hook "${id}" lives in a read-only (managed) layer`);
  }

  const data = readSettingsFile(row.layerPath);
  // Re-insert only when the same leaf isn't already present (idempotent restore).
  const alreadyPresent = flattenLayers(getSettings(projectPath).layers).some(
    (e) => e.id === id,
  );
  if (!alreadyPresent) {
    insertHookIntoData(data, row.event, row.matcher, row.command);
    writeSettingsFile(row.layerPath, data);
  }

  removeDisabled(id);
  rebroadcast(projectPath);
}

/** Recompute + push the settings snapshot so the UI refreshes (existing channel). */
function rebroadcast(projectPath?: string): void {
  broadcast({ type: "settings_changed", snapshot: getSettings(projectPath) });
}

/**
 * Enable/disable one hook by id, returning the fresh normalized list.
 *
 * Disable: must find the live entry (it's still in a file). Enable: looks up the
 * stored disabled row. Both are no-ops in the absent/idempotent cases and never
 * touch a managed layer (they throw a clear error instead).
 */
export function setHookEnabled(
  id: string,
  enabled: boolean,
  projectPath?: string,
): HookEntry[] {
  if (enabled) {
    enable(id, projectPath);
    return getHooks(projectPath);
  }

  const entry = getHooks(projectPath).find((e) => e.id === id);
  if (entry && entry.enabled) disable(entry, projectPath);
  return getHooks(projectPath);
}
