import * as RadixDialog from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type DialogVariant = 'center' | 'drawer-right';

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: DialogVariant;
  children: ReactNode;
  title?: string;
  contentClassName?: string;
};

const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

const contentVariant: Record<DialogVariant, string> = {
  center: 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 outline-none',
  'drawer-right': 'fixed right-0 top-0 h-full z-50 flex outline-none',
};

export function Dialog({
  open,
  onOpenChange,
  variant = 'center',
  children,
  title = 'Dialog',
  contentClassName,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="fixed inset-0 z-40"
          style={{
            background: 'var(--color-surface-overlay)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(contentVariant[variant], contentClassName)}
        >
          <RadixDialog.Title asChild>
            <span style={srOnly}>{title}</span>
          </RadixDialog.Title>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
