import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentPropsWithoutRef, type ElementType } from 'react';

import { cn } from '@/lib/utils';

/**
 * Shared gap scale, half-steps included. Maps the cva `gap` variant value to a
 * Tailwind `gap-*` utility (Tailwind's spacing scale is the centralized scale).
 */
export const GAP_CLASS = {
  0: 'gap-0',
  0.5: 'gap-0.5',
  1: 'gap-1',
  1.5: 'gap-1.5',
  2: 'gap-2',
  2.5: 'gap-2.5',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
} as const;

export type Gap = keyof typeof GAP_CLASS;

export const flex = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      col: 'flex-col',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    },
    gap: GAP_CLASS,
    wrap: {
      true: 'flex-wrap',
      false: '',
    },
  },
  defaultVariants: {
    direction: 'row',
  },
});

type FlexVariants = Omit<VariantProps<typeof flex>, 'gap'> & {
  gap?: Gap;
};

/**
 * Polymorphic layout props for a given element type `E`. The `as` prop selects
 * the rendered element; the remaining props are that element's native props
 * (minus the layout variants we own), so `as="form"` accepts `noValidate`,
 * `as="button"` accepts `type`, etc.
 */
export type FlexProps<E extends ElementType = 'div'> = FlexVariants & {
  /** Polymorphic element to render (div | section | header | form | ul | span | label…). */
  as?: E;
} & Omit<ComponentPropsWithoutRef<E>, keyof FlexVariants | 'as'>;

export function Flex<E extends ElementType = 'div'>({
  as,
  direction,
  align,
  justify,
  gap,
  wrap,
  className,
  ...props
}: FlexProps<E>) {
  const Comp = as ?? 'div';
  return (
    <Comp
      className={cn(flex({ direction, align, justify, gap, wrap }), className)}
      {...props}
    />
  );
}
