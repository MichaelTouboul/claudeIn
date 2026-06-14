import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const spinner = cva(
  'inline-block rounded-full border-2 border-current border-t-transparent animate-spin align-[-0.125em]',
  {
    variants: {
      size: {
        sm: 'w-3.5 h-3.5',
        md: 'w-5 h-5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export type SpinnerProps = ComponentProps<'span'> & VariantProps<typeof spinner>;

export function Spinner({ size, className, ...props }: SpinnerProps) {
  return <span role="status" aria-label="Loading" className={cn(spinner({ size }), className)} {...props} />;
}
