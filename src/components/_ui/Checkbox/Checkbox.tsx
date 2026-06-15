import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type CheckboxProps = ComponentProps<typeof RadixCheckbox.Root>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      className={cn(
        'flex items-center justify-center w-[18px] h-[18px] rounded-xs border border-border-strong bg-[var(--color-surface-inset)]',
        'transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        'hover:border-[var(--color-neutral-500)]',
        'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]',
        'data-[state=checked]:bg-[var(--color-accent-solid)] data-[state=checked]:border-[var(--color-accent-solid)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className="flex items-center justify-center text-white">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2.5 6.5L5 9l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
