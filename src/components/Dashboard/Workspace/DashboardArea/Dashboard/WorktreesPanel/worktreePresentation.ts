import type { SegmentedOption } from '@/components/_ui/SegmentedControl';

import { WorktreeFilter, WorktreeKind, WorktreeStatus } from './worktreeModel';

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

/**
 * kind → card presentation. The MAIN worktree is the repo ROOT — it carries a
 * subtle "root" tag, an idle-subtitle that names it the repo root, is NOT
 * removable, and is visually demoted (no accent border, dimmed). Linked
 * worktrees are the managed `.worktrees/<branch>` dirs. ONE behavior map per the
 * CLAUDE.md enum rule — never a `kind === 'main' ? … : …` fallback chain.
 */
export const KIND_PRESENTATION: Record<
  WorktreeKind,
  {
    /** A short tag rendered next to the branch, or null when none (linked rows). */
    tag: string | null;
    /** The agent-absent subtitle for this kind. */
    idleSubtitle: string;
    /** Whether the More menu offers a Remove action (main worktree is never removable). */
    removable: boolean;
    /** Demote the row chrome (dimmed, no accent border) — the main worktree. */
    demoted: boolean;
  }
> = {
  [WorktreeKind.Main]: {
    tag: 'root',
    idleSubtitle: 'repo root (main worktree)',
    removable: false,
    demoted: true,
  },
  [WorktreeKind.Linked]: {
    tag: null,
    idleSubtitle: 'No agent',
    removable: true,
    demoted: false,
  },
};
