import { type ComponentProps } from 'react';

import { field, type FieldVariantProps } from '@/components/_ui/Input';
import { cn } from '@/lib/utils';

export type TextareaProps = ComponentProps<'textarea'> & FieldVariantProps;

export function Textarea({ size, font, variant, className, ...props }: TextareaProps) {
  return <textarea className={cn(field({ size, font, variant }), 'resize-none', className)} {...props} />;
}
