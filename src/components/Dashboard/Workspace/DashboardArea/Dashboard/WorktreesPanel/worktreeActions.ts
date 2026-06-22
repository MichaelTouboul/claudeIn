import type { WorktreeOpResult } from '@/lib/types';
import { diffTabId, PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import type { WorktreeRow } from './worktreeModel';

/** A pending confirm-guarded op (merge/remove) a panel renders a dialog for. */
export interface PendingConfirm {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => Promise<WorktreeOpResult>;
}

/** The REAL per-row card handlers, shared by the per-repo and all-repos panels. */
export interface WorktreeCardActions {
  open: () => void;
  diff: () => void;
  merge: () => void;
  remove: () => void;
}

/** Open the repo-diff panel (`PanelTabKind.Diff`) for a worktree path. */
export function openWorktreeDiff(path: string): void {
  usePanelStore.getState().open({
    id: diffTabId(path),
    kind: PanelTabKind.Diff,
    title: `Diff — ${path.split(/[/\\]/).pop() ?? path}`,
    payload: { repoPath: path },
  });
}

/**
 * Open a worktree: activate the dashboard already open on its cwd; else fall back
 * to its diff so the action is always a real, visible result — never a silent
 * no-op (a worktree with no open dashboard has no Project to spawn one from).
 */
export function openWorktree(row: WorktreeRow): void {
  const dash = useWorkspaceStore.getState().dashboards.find((d) => d.cwd === row.path);
  if (dash) {
    useWorkspaceStore.getState().setActiveDashboard(dash.id);
    return;
  }
  openWorktreeDiff(row.path);
}

/**
 * Build the four REAL row handlers for a worktree belonging to `repoPath`. Pure
 * factory (no React) so both the per-repo hook and the all-repos panel — where each
 * row carries its OWN repo path — reuse the identical git wiring. `setConfirm`
 * stages the merge/remove behind the caller's confirm dialog; `refresh` re-pulls
 * the relevant stats after a successful mutation.
 */
export function buildCardActions(args: {
  repoPath: string;
  row: WorktreeRow;
  setConfirm: (c: PendingConfirm) => void;
  refresh: () => void;
}): WorktreeCardActions {
  const { repoPath, row, setConfirm, refresh } = args;
  return {
    open: () => openWorktree(row),
    diff: () => openWorktreeDiff(row.path),
    merge: () =>
      setConfirm({
        title: `Merge ${row.branch}`,
        body: `Merge the branch ${row.branch} into the repo's base (git merge --no-edit). On conflict, git's error is shown — nothing is committed automatically.`,
        confirmLabel: 'Merge',
        run: async () => {
          const result = await window.api.gitWorktreeMerge(repoPath, row.branch);
          if (result.ok) refresh();
          return result;
        },
      }),
    remove: () =>
      setConfirm({
        title: `Remove worktree`,
        body: `Removes the worktree ${row.path}. The branch ${row.branch} is kept. This action is forced (uncommitted changes are lost).`,
        confirmLabel: 'Remove',
        danger: true,
        run: async () => {
          const result = await window.api.gitWorktreeRemove(repoPath, row.path, true);
          if (result.ok) refresh();
          return result;
        },
      }),
  };
}
