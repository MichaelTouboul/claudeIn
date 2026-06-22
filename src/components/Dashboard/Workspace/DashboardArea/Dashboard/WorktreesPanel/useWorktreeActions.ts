import { useCallback, useState } from 'react';

import type { WorktreeOpResult } from '@/lib/types';

import { buildCardActions, type PendingConfirm } from './worktreeActions';
import type { WorktreeCardAction } from './WorktreeCard';
import type { WorktreeRow } from './worktreeModel';

export type { PendingConfirm };

export interface WorktreeActions {
  /** Create a worktree for a branch (real `git worktree add`), then refresh stats. */
  create: (branch: string) => Promise<WorktreeOpResult>;
  /** Per-row action handlers for the card (open / diff / merge / remove). */
  cardActions: (row: WorktreeRow) => WorktreeCardAction;
  /** The currently-pending confirm op, or null. */
  confirm: PendingConfirm | null;
  closeConfirm: () => void;
}

/**
 * Wires the per-repo Worktrees panel's REAL actions to git + the workspace. The
 * row handlers (open / diff / merge / remove) come from the shared
 * `buildCardActions` factory — the SAME wiring the all-repos panel reuses; this
 * hook only adds the repo-scoped `create` and the confirm-dialog state.
 */
export function useWorktreeActions(repoPath: string, refreshStats: () => void): WorktreeActions {
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const create = useCallback(
    async (branch: string) => {
      const result = await window.api.gitWorktreeAdd(repoPath, branch);
      if (result.ok) refreshStats();
      return result;
    },
    [repoPath, refreshStats],
  );

  const cardActions = useCallback(
    (row: WorktreeRow): WorktreeCardAction =>
      buildCardActions({ repoPath, row, setConfirm, refresh: refreshStats }),
    [repoPath, refreshStats],
  );

  return { create, cardActions, confirm, closeConfirm };
}
