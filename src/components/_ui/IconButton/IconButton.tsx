import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const iconButton = cva(
  'inline-flex items-center justify-center p-0 outline-none transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      intent: {
        ghost: 'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg',
        primary: 'bg-[var(--color-accent-solid)] text-white hover:brightness-110',
        outline: 'border border-border-strong text-fg hover:bg-surface-2',
      },
      size: {
        sm: 'h-[var(--control-sm)] w-[var(--control-sm)] rounded-sm',
        md: 'h-[var(--control-md)] w-[var(--control-md)] rounded-md',
        lg: 'h-[var(--control-lg)] w-[var(--control-lg)] rounded-md',
      },
      active: {
        true: 'bg-[var(--color-accent-dim)] text-accent',
        false: '',
      },
    },
    defaultVariants: {
      intent: 'ghost',
      size: 'md',
      active: false,
    },
  },
);

export type IconButtonProps = ComponentProps<'button'> & VariantProps<typeof iconButton>;

/**
 * Square, icon-only button — same intent vocabulary as Button, sized to a single
 * glyph. Always pass an `aria-label` for an accessible name.
 */
export function IconButton({ intent, size, active, className, type, ...props }: IconButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(iconButton({ intent, size, active }), className)}
      {...props}
    />
  );
}
