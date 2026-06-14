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
          className={cn('z-50 rounded-xl overflow-hidden outline-none', className)}
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 1px rgba(6,182,212,0.1)',
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
