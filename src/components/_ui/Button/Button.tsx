import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center gap-2 font-sans font-medium rounded-md outline-none transition-[background-color,color,border-color,filter,transform] duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] active:scale-[var(--press-scale)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      intent: {
        primary:
          'bg-[var(--color-accent-solid)] text-white border border-transparent hover:brightness-110',
        secondary:
          'bg-surface-2 border border-border-strong text-fg hover:bg-surface-3',
        outline:
          'bg-transparent border border-border-strong text-fg hover:bg-surface-2',
        ghost:
          'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg',
        danger:
          'bg-transparent text-[var(--color-danger)] border border-transparent hover:bg-danger/10',
        'danger-solid':
          'bg-danger text-white border border-transparent hover:brightness-110',
      },
      size: {
        sm: 'h-[var(--control-sm)] px-2.5 text-xs rounded-sm gap-1.5',
        md: 'h-[var(--control-md)] px-3.5 text-sm',
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
    /** Glyph rendered before the label. */
    leftIcon?: ReactNode;
    /** Glyph rendered after the label. */
    rightIcon?: ReactNode;
  };

export function Button({ intent, size, asChild, leftIcon, rightIcon, className, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  // `asChild` forwards to a single child element (Slot) — adornments would break
  // that contract, so they only apply to the plain-button path.
  if (asChild) {
    return (
      <Comp className={cn(button({ intent, size }), className)} {...props}>
        {children}
      </Comp>
    );
  }
  return (
    <Comp className={cn(button({ intent, size }), className)} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </Comp>
  );
}
