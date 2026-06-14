import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const statusDot = cva('inline-block rounded-full shrink-0', {
  variants: {
    size: {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

export type StatusDotProps = ComponentProps<'span'> &
  VariantProps<typeof statusDot> & {
    /** Apply the pulse animation (e.g. for a live/running state). */
    pulse?: boolean;
  };

export function StatusDot({ size, pulse, className, ...props }: StatusDotProps) {
  return <span className={cn(statusDot({ size }), pulse && 'animate-pulse', className)} {...props} />;
}
