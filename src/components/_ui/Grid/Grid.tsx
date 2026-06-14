import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentPropsWithoutRef, type ElementType } from 'react';

import { type Gap,GAP_CLASS } from '@/components/_ui/Flex';
import { cn } from '@/lib/utils';

const COLS_CLASS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
} as const;

const ROWS_CLASS = {
  1: 'grid-rows-1',
  2: 'grid-rows-2',
  3: 'grid-rows-3',
  4: 'grid-rows-4',
  5: 'grid-rows-5',
  6: 'grid-rows-6',
} as const;

export type GridCols = keyof typeof COLS_CLASS;
export type GridRows = keyof typeof ROWS_CLASS;

export const grid = cva('grid', {
  variants: {
    cols: COLS_CLASS,
    rows: ROWS_CLASS,
    gap: GAP_CLASS,
  },
});

type GridVariants = Omit<VariantProps<typeof grid>, 'cols' | 'rows' | 'gap'> & {
  cols?: GridCols;
  rows?: GridRows;
  gap?: Gap;
};

export type GridProps<E extends ElementType = 'div'> = GridVariants & {
  as?: E;
} & Omit<ComponentPropsWithoutRef<E>, keyof GridVariants | 'as'>;

export function Grid<E extends ElementType = 'div'>({
  as,
  cols,
  rows,
  gap,
  className,
  ...props
}: GridProps<E>) {
  const Comp = as ?? 'div';
  return <Comp className={cn(grid({ cols, rows, gap }), className)} {...props} />;
}
