import { useEffect, useState } from 'react';

import { Button } from '@/components/_ui/Button';
import { Dialog } from '@/components/_ui/Dialog';
import { Input } from '@/components/_ui/Input';
import type { WorktreeOpResult } from '@/lib/types';

export interface NewWorktreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs the real `git worktree add` for the typed branch; result surfaced honestly. */
  onCreate: (branch: string) => Promise<WorktreeOpResult>;
}

/**
 * Prompts for a branch name and creates a real worktree via `onCreate` (the panel
 * wires it to `window.api.gitWorktreeAdd`). On failure it surfaces git's verbatim
 * message and keeps the dialog open — it never pretends the worktree was created.
 */
export function NewWorktreeDialog({ open, onOpenChange, onCreate }: NewWorktreeDialogProps) {
  const [branch, setBranch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setBranch('');
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const submit = async () => {
    const name = branch.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    const result = await onCreate(name);
    setBusy(false);
    if (result.ok) onOpenChange(false);
    else setError(result.message || 'git worktree add failed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="New worktree" contentClassName="w-[min(92vw,420px)]">
      <div
        className="flex flex-col overflow-hidden rounded-[var(--radius-lg)]"
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-dialog)',
        }}
      >
        <div className="flex flex-col gap-2 px-4 pt-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            New worktree
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Creates a linked worktree for a branch (new or existing), under{' '}
            <span style={{ fontFamily: 'var(--font-mono)' }}>.worktrees/</span>.
          </p>
          <Input
            autoFocus
            value={branch}
            placeholder="feature/my-branch"
            onChange={(e) => setBranch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
            className="mt-1"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          {error ? (
            <p
              className="whitespace-pre-wrap text-xs"
              style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}
            >
              {error}
            </p>
          ) : null}
        </div>
        <div className="mt-3 flex justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <Button type="button" intent="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" intent="primary" size="sm" disabled={busy || !branch.trim()} onClick={() => void submit()}>
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
