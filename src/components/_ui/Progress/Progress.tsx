import * as RadixProgress from '@radix-ui/react-progress';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type ProgressProps = Omit<ComponentProps<typeof RadixProgress.Root>, 'value'> & {
  /** Fill ratio in the 0–1 range; clamped. Ignored when `indeterminate`. */
  value: number;
  /** CSS color (e.g. a design-system var) for the filled portion. */
  fillColor: string;
  /** Animate an unknown-duration bar instead of a fixed fill ratio. */
  indeterminate?: boolean;
  trackClassName?: string;
};

export function Progress({
  value,
  fillColor,
  indeterminate = false,
  className,
  trackClassName,
  style,
  ...props
}: ProgressProps) {
  const ratio = Math.min(Math.max(value, 0), 1);
  const percent = ratio * 100;

  return (
    <RadixProgress.Root
      value={indeterminate ? null : percent}
      max={100}
      className={cn('relative overflow-hidden rounded-full', trackClassName)}
      style={{ background: 'var(--color-surface-inset)', ...style }}
      {...props}
    >
      <RadixProgress.Indicator
        className={cn(
          'h-full rounded-full',
          indeterminate ? 'progress-indeterminate' : 'w-full transition-[transform,background] duration-300',
          className,
        )}
        style={{
          background: fillColor,
          ...(indeterminate ? {} : { transform: `translateX(-${100 - percent}%)` }),
        }}
      />
    </RadixProgress.Root>
  );
}
