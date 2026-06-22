import { useEffect, useState } from 'react';

import { Button } from '@/components/_ui/Button';
import { Dialog } from '@/components/_ui/Dialog';
import type { WorktreeOpResult } from '@/lib/types';

export interface WorktreeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  /** Label + intent of the confirm button (danger for Remove, primary for Merge). */
  confirmLabel: string;
  danger?: boolean;
  /** The real git op; its verbatim message is surfaced on failure (never faked). */
  onConfirm: () => Promise<WorktreeOpResult>;
}

/**
 * Confirmation guard for a destructive/irreversible worktree op (merge / remove).
 * Runs the REAL git op on confirm; on success it closes, on failure it keeps the
 * dialog open and shows git's verbatim stderr (e.g. a merge conflict) — we do not
 * pretend the op succeeded.
 */
export function WorktreeConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
}: WorktreeConfirmDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await onConfirm();
    setBusy(false);
    if (result.ok) onOpenChange(false);
    else setError(result.message || 'git failed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} contentClassName="w-[min(92vw,440px)]">
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
            {title}
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {body}
          </p>
          {error ? (
            <pre
              className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md p-2 text-xs"
              style={{
                color: 'var(--color-danger)',
                background: 'var(--color-surface-2)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {error}
            </pre>
          ) : null}
        </div>
        <div className="mt-3 flex justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <Button type="button" intent="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            intent={danger ? 'danger-solid' : 'primary'}
            size="sm"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
