import { type ReactNode, useEffect, useRef, useState } from 'react';

import type { BlockAction } from '../responseBody.types';

export type BlockShellProps = {
  /** Render-prop: receives `register` so the block can publish its actions, returns the block body. */
  children: (register: (actions: BlockAction[]) => void) => ReactNode;
};

export function BlockShell({ children }: BlockShellProps) {
  const [actions, setActions] = useState<BlockAction[]>([]);
  const pending = useRef<BlockAction[]>([]);
  // Always the CURRENT render's actions. The `actions` state only re-syncs when
  // the id set changes, so its closures can go stale if an action's captured
  // data changes without its id — dispatch through this ref to avoid that.
  const latest = useRef<BlockAction[]>([]);

  // The block calls `register` during render; capture into a ref (no state churn).
  pending.current = [];
  const register = (next: BlockAction[]) => {
    pending.current = next;
    latest.current = next;
  };

  const body = children(register);

  // Reconcile once per commit, keyed by the action ids, so toolbar buttons appear
  // without a render loop. The key changes only when the registered set changes.
  const actionKey = pending.current.map((a) => a.id).join('|');
  useEffect(() => {
    setActions(pending.current);
  }, [actionKey]);

  // Run an action by id through the LATEST registered set (never the snapshot in
  // `actions` state), so a click always invokes the current closure.
  const runById = (id: string) => {
    const action = latest.current.find((a) => a.id === id);
    if (action && action.kind === 'local') action.run();
  };

  return (
    <div className="group relative my-2 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
      {actions.length > 0 ? (
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {actions.map((a) => (
            <button
              key={a.id}
              disabled={a.kind === 'claude'}
              onClick={a.kind === 'local' ? () => runById(a.id) : undefined}
              title={a.kind === 'claude' ? 'Coming soon' : a.label}
              className="rounded px-2 py-1 text-xs font-medium disabled:opacity-40"
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)' }}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
      {body}
    </div>
  );
}
