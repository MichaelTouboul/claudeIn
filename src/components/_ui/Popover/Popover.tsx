import * as RadixPopover from '@radix-ui/react-popover';
import { type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type PopoverProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
  sideOffset?: number;
};

export function Popover({ trigger, children, align = 'start', className, sideOffset = 6 }: PopoverProps) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={sideOffset}
          // Portalled to <body>: only z-index decides paint order. App-root
          // overlays (the fixed top-right notification bar that hosts the
          // ImproveNotification trigger) sit at z-60, so the panel must
          // out-stack them or it opens *behind* its own overlay and is unseen.
          className={cn('z-[70] rounded-lg overflow-hidden outline-none', className)}
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-popover)',
          }}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

export type PopoverCloseProps = ComponentProps<typeof RadixPopover.Close>;

export function PopoverClose(props: PopoverCloseProps) {
  return <RadixPopover.Close {...props} />;
}
