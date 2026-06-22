import { useCallback, useState } from 'react';

import {
  buildCardActions,
  type PendingConfirm,
  type WorktreeCardActions,
} from '../WorktreesPanel/worktreeActions';
import type { WorktreeRow } from '../WorktreesPanel/worktreeModel';

export interface AllWorktreeActions {
  /** Per-row handlers for a worktree belonging to `repoPath` (open/diff/merge/remove). */
  cardActions: (repoPath: string, row: WorktreeRow) => WorktreeCardActions;
  /** The currently-pending confirm op (merge/remove), or null. */
  confirm: PendingConfirm | null;
  closeConfirm: () => void;
}

/**
 * The all-repos panel's REAL row actions. Each row carries its OWN repo path, so
 * `cardActions(repoPath, row)` delegates to the SAME shared `buildCardActions`
 * factory the per-repo panel uses — no duplicated git wiring. One confirm-dialog
 * state is shared across every repo group; `refresh` re-pulls the aggregation.
 */
export function useAllWorktreeActions(refresh: () => void): AllWorktreeActions {
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const cardActions = useCallback(
    (repoPath: string, row: WorktreeRow): WorktreeCardActions =>
      buildCardActions({ repoPath, row, setConfirm, refresh }),
    [refresh],
  );

  return { cardActions, confirm, closeConfirm };
}
