import type { SegmentedOption } from '@/components/_ui/SegmentedControl';

import { WorktreeFilter, WorktreeStatus } from './worktreeModel';

/**
 * status → dot appearance (color token + pulse) and label. ONE behavior map per
 * the CLAUDE.md enum rule — the card never derives its dot with a fallback chain.
 * Colors are design-system tokens (no raw hex).
 */
export const STATUS_PRESENTATION: Record<
  WorktreeStatus,
  { color: string; pulse: boolean; label: string }
> = {
  [WorktreeStatus.Running]: { color: 'var(--color-active)', pulse: true, label: 'running' },
  [WorktreeStatus.Review]: { color: 'var(--color-warning)', pulse: false, label: 'needs review' },
  [WorktreeStatus.Idle]: { color: 'var(--color-fg-subtle)', pulse: false, label: 'idle' },
};

/** The SegmentedControl options for the panel filter (All / Active / Idle). */
export const FILTER_OPTIONS: SegmentedOption<WorktreeFilter>[] = [
  { value: WorktreeFilter.All, label: 'All' },
  { value: WorktreeFilter.Active, label: 'Active' },
  { value: WorktreeFilter.Idle, label: 'Idle' },
];
