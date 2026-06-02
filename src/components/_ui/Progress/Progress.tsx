import * as RadixProgress from '@radix-ui/react-progress';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/cn';

export type ProgressProps = Omit<ComponentProps<typeof RadixProgress.Root>, 'value'> & {
  /** Fill ratio in the 0–1 range; clamped. */
  value: number;
  /** CSS color (e.g. a design-system var) for the filled portion. */
  fillColor: string;
  trackClassName?: string;
};

export function Progress({ value, fillColor, className, trackClassName, style, ...props }: ProgressProps) {
  const ratio = Math.min(Math.max(value, 0), 1);
  const percent = ratio * 100;

  return (
    <RadixProgress.Root
      value={percent}
      max={100}
      className={cn('relative overflow-hidden rounded-full', trackClassName)}
      style={{ background: 'var(--color-surface-3)', ...style }}
      {...props}
    >
      <RadixProgress.Indicator
        className={cn('h-full w-full rounded-full transition-[transform,background] duration-300', className)}
        style={{ background: fillColor, transform: `translateX(-${100 - percent}%)` }}
      />
    </RadixProgress.Root>
  );
}
