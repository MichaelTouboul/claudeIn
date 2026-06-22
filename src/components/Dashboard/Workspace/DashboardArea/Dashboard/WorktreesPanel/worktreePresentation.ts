import type { SegmentedOption } from '@/components/_ui/SegmentedControl';

import { WorktreeFilter, WorktreeStatus } from './worktreeModel';

/**
 * status → dot appearance (color token + pulse) and FR label. ONE behavior map
 * per the CLAUDE.md enum rule — the card never derives its dot with a fallback
 * chain. Colors are design-system tokens (no raw hex).
 */
export const STATUS_PRESENTATION: Record<
  WorktreeStatus,
  { color: string; pulse: boolean; label: string }
> = {
  [WorktreeStatus.Running]: { color: 'var(--color-active)', pulse: true, label: 'en cours' },
  [WorktreeStatus.Review]: { color: 'var(--color-warning)', pulse: false, label: 'à relire' },
  [WorktreeStatus.Idle]: { color: 'var(--color-fg-subtle)', pulse: false, label: 'au repos' },
};

/** The SegmentedControl options for the panel filter (Tous / Actifs / Au repos). */
export const FILTER_OPTIONS: SegmentedOption<WorktreeFilter>[] = [
  { value: WorktreeFilter.All, label: 'Tous' },
  { value: WorktreeFilter.Active, label: 'Actifs' },
  { value: WorktreeFilter.Idle, label: 'Au repos' },
];
