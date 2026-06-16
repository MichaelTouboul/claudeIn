import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

export type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `sm` = compact sidebar density; `md` = default. */
  size?: 'sm' | 'md';
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<SegmentedControlProps<string>['size']>, string> = {
  sm: 'text-[11px] px-2.5 py-1',
  md: 'text-sm px-3 py-1.5',
};

/**
 * A single-select pill group. Built on native buttons + the design-system
 * tokens (no Radix). The active segment reads accent-tinted; the rest are
 * muted. Generic over the option value so callers get exhaustive typing.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-px p-0.5 rounded-lg', className)}
      style={{ background: 'var(--color-surface-inset)', border: '1px solid var(--color-border-subtle)' }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap',
              'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
              SIZE_CLASS[size],
            )}
            style={
              isActive
                ? { background: 'var(--color-accent-subtle)', color: 'var(--color-accent-text)' }
                : { color: 'var(--color-text-muted)' }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
