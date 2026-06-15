import type { SettingsSource } from "./settings.types";

/**
 * A single, normalized Claude Code hook flattened out of the settings layers.
 *
 * Claude Code's on-disk shape is nested and has NO native "enabled" flag:
 *   settings.json → hooks: { <Event>: [ { matcher?, hooks: [ { type, command } ] } ] }
 * One `HookEntry` is the leaf — a single `{ type: "command", command }` under one
 * `{ matcher }` group of one event, attributed to the layer that defined it.
 */
export interface HookEntry {
  /** Stable signature: hash of `source|event|matcher|command`. Survives reorder. */
  id: string;
  /** Event name, e.g. "PreToolUse", "PostToolUse", "Stop". */
  event: string;
  /** The group matcher, or null when the group had none (event-wide hook). */
  matcher: string | null;
  /** The command string the hook runs. */
  command: string;
  /** Which settings layer defined this hook (lowest layer that contributes it). */
  source: SettingsSource;
  /** Absolute path of that layer's settings file. */
  sourcePath: string;
  /** false only when this hook id is recorded in `disabled_hooks`. */
  enabled: boolean;
  /** true when the defining layer is a writable file (not `managed`). */
  editable: boolean;
}
