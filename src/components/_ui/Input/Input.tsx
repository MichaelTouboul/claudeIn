import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

import { field, type FieldVariantProps } from './field';

export type InputProps = Omit<ComponentProps<'input'>, 'size'> & FieldVariantProps;

export function Input({ size, font, variant, className, ...props }: InputProps) {
  return <input className={cn(field({ size, font, variant }), className)} {...props} />;
}
