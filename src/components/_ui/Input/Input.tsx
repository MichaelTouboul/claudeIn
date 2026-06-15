import { type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { field, type FieldVariantProps } from './field';

export type InputProps = Omit<ComponentProps<'input'>, 'size'> &
  FieldVariantProps & {
    /** Optional glyph rendered inside the field, before the value. */
    leadingIcon?: ReactNode;
  };

export function Input({ size, font, variant, leadingIcon, className, ...props }: InputProps) {
  if (leadingIcon === undefined || leadingIcon === null) {
    return <input className={cn(field({ size, font, variant }), className)} {...props} />;
  }
  // With a leading adornment the field chrome moves to the wrapper and the input
  // itself goes bare, so the icon sits inside the same bordered control.
  return (
    <div className={cn(field({ size, font, variant }), 'flex items-center gap-2', className)}>
      <span className="flex shrink-0 text-fg-subtle">{leadingIcon}</span>
      <input className={cn(field({ size, font, variant: 'bare' }), 'flex-1')} {...props} />
    </div>
  );
}
