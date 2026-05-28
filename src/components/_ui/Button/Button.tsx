import { type ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-1.5 font-sans font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      intent: {
        primary: 'bg-[var(--color-accent)] text-[var(--color-surface-0)] hover:opacity-90',
        ghost:
          'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]',
        danger:
          'bg-transparent text-[var(--color-danger)] hover:bg-[rgba(248,113,113,0.1)]',
      },
      size: {
        sm: 'h-6 px-2 text-xs',
        md: 'h-8 px-3 text-sm',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      intent: 'ghost',
      size: 'md',
    },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof button> & {
    asChild?: boolean;
  };

export function Button({ intent, size, asChild, className, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(button({ intent, size }), className)} {...props} />;
}
