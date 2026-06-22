// Pure logic for the composer status strip. Kept framework-free + unit-tested:
// the context-usage color thresholds, the session-cost formatting, and the
// permission-mode labels are all finite-state mappings, modelled as an `as const`
// enum + a value→behavior `Record` (never a fallback chain).

/** Context-usage severity, driving the mini progress-bar color. */
export const ContextLevel = {
  Ok: 'ok',
  Warn: 'warn',
  Danger: 'danger',
} as const;
export type ContextLevel = (typeof ContextLevel)[keyof typeof ContextLevel];

/**
 * The bar's severity from the used-context percent.
 * Thresholds (from the design): green < 60%, amber < 85%, red ≥ 85%.
 */
export function contextLevel(percent: number): ContextLevel {
  if (percent >= 85) return ContextLevel.Danger;
  if (percent >= 60) return ContextLevel.Warn;
  return ContextLevel.Ok;
}

// One authoritative level → color token map. The project has no `--color-success`
// token; its green is `--color-active` (see src/index.css).
const CONTEXT_LEVEL_COLOR: Record<ContextLevel, string> = {
  [ContextLevel.Ok]: 'var(--color-active)',
  [ContextLevel.Warn]: 'var(--color-warning)',
  [ContextLevel.Danger]: 'var(--color-danger)',
};

export function contextLevelColorVar(level: ContextLevel): string {
  return CONTEXT_LEVEL_COLOR[level];
}

/** Session cost as `$x.xx`. Guards against NaN/negative (renders `$0.00`). */
export function formatCost(usd: number): string {
  const safe = Number.isFinite(usd) && usd > 0 ? usd : 0;
  return `$${safe.toFixed(2)}`;
}

/**
 * Claude Code permission modes. Values mirror the CLI's `--permission-mode`
 * flag names so a future spawn-arg wiring is a direct pass-through.
 */
export const PermissionMode = {
  Ask: 'default',
  AcceptEdits: 'acceptEdits',
  Plan: 'plan',
} as const;
export type PermissionMode = (typeof PermissionMode)[keyof typeof PermissionMode];

const PERMISSION_MODE_LABEL: Record<PermissionMode, string> = {
  [PermissionMode.Ask]: 'Ask',
  [PermissionMode.AcceptEdits]: 'Auto-accept',
  [PermissionMode.Plan]: 'Plan',
};

export function permissionModeLabel(mode: PermissionMode): string {
  return PERMISSION_MODE_LABEL[mode];
}
