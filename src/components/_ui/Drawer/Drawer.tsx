import { X } from 'lucide-react';
import { type ReactNode } from 'react';

import { Button } from '@/components/_ui/Button';
import { cn } from '@/lib/cn';

export const DrawerState = { Open: 'open', Closed: 'closed' } as const;
export type DrawerState = (typeof DrawerState)[keyof typeof DrawerState];

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * Behavior-per-state: each finite state maps to whether the panel renders,
 * rather than deriving visibility from a fallback chain.
 */
const isVisible: Record<DrawerState, boolean> = {
  [DrawerState.Open]: true,
  [DrawerState.Closed]: false,
};

export function Drawer({ open, onClose, title, children, className }: DrawerProps) {
  const state: DrawerState = open ? DrawerState.Open : DrawerState.Closed;

  if (!isVisible[state]) {
    return null;
  }

  return (
    <aside
      aria-label={title}
      className={cn(
        'fixed right-0 top-0 z-40 flex h-full w-80 flex-col border-l',
        className,
      )}
      style={{
        background: 'var(--color-surface-1)',
        borderColor: 'var(--color-border)',
      }}
    >
      <header
        className="flex items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2
          className="truncate font-sans text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h2>
        <Button
          intent="ghost"
          size="icon"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}
