import type { AgentFrontmatter } from '@/lib/types';

/**
 * The rail "Configuration" rows. Each one maps to a REAL `AgentFrontmatter` key
 * that round-trips through the agent `.md` write (`updateAgent`), so editing a
 * row persists to disk. A row reads as "Inherited" only when its frontmatter
 * value is genuinely absent (null / undefined / empty) — never as a primary
 * derivation, only as the absent-value default.
 */
export const RailFieldKind = {
  Select: 'select',
  Number: 'number',
  Switch: 'switch',
} as const;
export type RailFieldKind = (typeof RailFieldKind)[keyof typeof RailFieldKind];

export type RailSelectOption = { value: string; label: string };

export type RailField = {
  /** The `AgentFrontmatter` key this row reads from and writes back to. */
  key: keyof AgentFrontmatter & string;
  label: string;
  kind: RailFieldKind;
  /** Options for `select` rows; the empty-value option means "inherit". */
  options?: RailSelectOption[];
};

const MODEL_OPTIONS: RailSelectOption[] = [
  { value: '', label: '— inherit —' },
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

const PERMISSION_OPTIONS: RailSelectOption[] = [
  { value: '', label: '— inherit —' },
  { value: 'default', label: 'Default' },
  { value: 'plan', label: 'Plan' },
  { value: 'bypassPermissions', label: 'Bypass permissions' },
];

const MEMORY_OPTIONS: RailSelectOption[] = [
  { value: '', label: '— inherit —' },
  { value: 'project', label: 'Project' },
  { value: 'user', label: 'User' },
];

const ISOLATION_OPTIONS: RailSelectOption[] = [
  { value: '', label: '— inherit —' },
  { value: 'worktree', label: 'Worktree' },
];

export const RAIL_FIELDS: RailField[] = [
  { key: 'model', label: 'Model', kind: RailFieldKind.Select, options: MODEL_OPTIONS },
  { key: 'maxTurns', label: 'Max turns', kind: RailFieldKind.Number },
  { key: 'background', label: 'Background', kind: RailFieldKind.Switch },
  { key: 'permissionMode', label: 'Permission', kind: RailFieldKind.Select, options: PERMISSION_OPTIONS },
  { key: 'memory', label: 'Memory', kind: RailFieldKind.Select, options: MEMORY_OPTIONS },
  { key: 'isolation', label: 'Isolation', kind: RailFieldKind.Select, options: ISOLATION_OPTIONS },
];

/** A frontmatter value reads as "Inherited" when it's genuinely absent. */
export function isInherited(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** Normalise `tools` (string | string[]) into a clean chip list. */
export function toToolList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(Boolean);
  return [];
}
