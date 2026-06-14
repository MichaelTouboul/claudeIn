import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center gap-1.5 font-sans font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      intent: {
        primary: 'bg-accent text-surface-0 hover:opacity-90',
        outline:
          'bg-transparent border border-border text-fg-muted hover:bg-surface-3 hover:text-fg',
        ghost:
          'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg',
        danger:
          'bg-transparent text-fg-subtle hover:bg-danger/10 hover:text-danger',
        'danger-solid':
          'bg-danger text-surface-0 hover:opacity-90',
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
