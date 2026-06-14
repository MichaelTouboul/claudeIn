import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type CheckboxProps = ComponentProps<typeof RadixCheckbox.Root>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      className={cn(
        'flex items-center justify-center w-4 h-4 rounded border border-border bg-surface-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        'data-[state=checked]:bg-accent data-[state=checked]:border-accent',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className="flex items-center justify-center text-surface-0">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2.5 6.5L5 9l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
