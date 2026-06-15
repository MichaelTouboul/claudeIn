import { createHash } from "node:crypto";
import { SettingsSource } from "../../types/settings.types";
import type { SettingsLayer } from "../../types/settings.types";
import type { HookEntry } from "../../types/hooks.types";

/**
 * Pure flattening of Claude Code settings `hooks` into normalized `HookEntry[]`.
 *
 * No filesystem, no DB — unit-testable in isolation. The on-disk shape is:
 *   hooks: { <Event>: [ { matcher?: string, hooks: [ { type, command } ] } ] }
 * Each leaf command becomes one `HookEntry`, attributed to its defining layer.
 *
 * A hook is `editable` unless its layer is `managed` (read-only system policy).
 * `enabled` defaults to true here; the caller flips it off for ids the DB records
 * as disabled (the disable feature removes the entry from the file but remembers
 * it so it can be restored — see hooks.service).
 */

/** Stable id: hash of `source|event|matcher|command`. Independent of order. */
export function hookId(
  source: SettingsSource,
  event: string,
  matcher: string | null,
  command: string,
): string {
  return createHash("sha1")
    .update(`${source}|${event}|${matcher ?? ""}|${command}`)
    .digest("hex")
    .slice(0, 16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Flatten one layer's `hooks` object into normalized entries. Tolerant of
 * malformed shapes (skips anything that isn't a `{ type: "command", command }`
 * leaf under a `{ hooks: [...] }` group). Returns [] when the layer has no hooks.
 */
export function flattenLayerHooks(layer: SettingsLayer): HookEntry[] {
  const hooks = layer.data?.hooks;
  if (!isRecord(hooks)) return [];

  const editable = layer.source !== SettingsSource.Managed;
  const result: HookEntry[] = [];

  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (!isRecord(group)) continue;
      const matcher =
        typeof group.matcher === "string" && group.matcher.length > 0
          ? group.matcher
          : null;
      const groupHooks = group.hooks;
      if (!Array.isArray(groupHooks)) continue;
      for (const hook of groupHooks) {
        if (!isRecord(hook)) continue;
        if (hook.type !== "command" || typeof hook.command !== "string") continue;
        const command = hook.command;
        result.push({
          id: hookId(layer.source, event, matcher, command),
          event,
          matcher,
          command,
          source: layer.source,
          sourcePath: layer.path,
          enabled: true,
          editable,
        });
      }
    }
  }

  return result;
}

/**
 * Flatten every layer (low → high precedence order preserved) into one list.
 * Each layer is attributed independently, so the same command in two layers
 * yields two distinct entries (distinct ids).
 */
export function flattenLayers(layers: SettingsLayer[]): HookEntry[] {
  return layers.flatMap(flattenLayerHooks);
}
