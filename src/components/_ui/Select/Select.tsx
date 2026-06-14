import { type ComponentProps } from 'react';

import { field, type FieldVariantProps } from '@/components/_ui/Input';
import { cn } from '@/lib/utils';

export type SelectProps = ComponentProps<'select'> & FieldVariantProps;

/** Native `<select>` (intentional — native a11y), styled with the shared field chrome. */
export function Select({ size, font, variant, className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(field({ size, font, variant }), 'appearance-none cursor-pointer pr-7', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%238892a4' stroke-width='1.5'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.5rem center',
        backgroundSize: '0.75rem',
      }}
      {...props}
    >
      {children}
    </select>
  );
}
