import { useCallback, useState } from 'react';

import type { WorktreeOpResult } from '@/lib/types';
import { diffTabId, PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import type { WorktreeCardAction } from './WorktreeCard';
import type { WorktreeRow } from './worktreeModel';

/** A pending confirm-guarded op (merge/remove) the panel renders a dialog for. */
export interface PendingConfirm {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => Promise<WorktreeOpResult>;
}

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
 * Wires the Worktrees panel's REAL actions to git + the workspace:
 * - Ouvrir: activate the dashboard already open on that worktree's cwd; if none
 *   is open, fall back to opening the diff surface for it (always a real, visible
 *   result — never a silent no-op).
 * - Comparer: open the existing repo-diff panel (`PanelTabKind.Diff`) for the path.
 * - Merger / Supprimer: stage a confirm; on confirm run the real git op and
 *   refresh stats. The result (incl. a conflict's stderr) is surfaced by the dialog.
 */
export function useWorktreeActions(repoPath: string, refreshStats: () => void): WorktreeActions {
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const openDiff = useCallback((path: string) => {
    usePanelStore.getState().open({
      id: diffTabId(path),
      kind: PanelTabKind.Diff,
      title: `Diff — ${path.split(/[/\\]/).pop() ?? path}`,
      payload: { repoPath: path },
    });
  }, []);

  const open = useCallback(
    (row: WorktreeRow) => {
      const dash = useWorkspaceStore.getState().dashboards.find((d) => d.cwd === row.path);
      if (dash) {
        useWorkspaceStore.getState().setActiveDashboard(dash.id);
        return;
      }
      // No dashboard is open on this worktree (it has no Project object to spawn a
      // full dashboard from) — open its diff so the action is real and visible.
      openDiff(row.path);
    },
    [openDiff],
  );

  const create = useCallback(
    async (branch: string) => {
      const result = await window.api.gitWorktreeAdd(repoPath, branch);
      if (result.ok) refreshStats();
      return result;
    },
    [repoPath, refreshStats],
  );

  const cardActions = useCallback(
    (row: WorktreeRow): WorktreeCardAction => ({
      open: () => open(row),
      diff: () => openDiff(row.path),
      merge: () =>
        setConfirm({
          title: `Merger ${row.branch}`,
          body: `Merge la branche ${row.branch} dans la base du repo (git merge --no-edit). En cas de conflit, l’erreur git est affichée — rien n’est validé automatiquement.`,
          confirmLabel: 'Merger',
          run: async () => {
            const result = await window.api.gitWorktreeMerge(repoPath, row.branch);
            if (result.ok) refreshStats();
            return result;
          },
        }),
      remove: () =>
        setConfirm({
          title: `Supprimer le worktree`,
          body: `Supprime le worktree ${row.path}. La branche ${row.branch} est conservée. Cette action est forcée (changements non commités perdus).`,
          confirmLabel: 'Supprimer',
          danger: true,
          run: async () => {
            const result = await window.api.gitWorktreeRemove(repoPath, row.path, true);
            if (result.ok) refreshStats();
            return result;
          },
        }),
    }),
    [open, openDiff, repoPath, refreshStats],
  );

  return { create, cardActions, confirm, closeConfirm };
}
