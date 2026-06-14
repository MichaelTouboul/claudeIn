import { type ElementType } from 'react';

import { Flex, type FlexProps } from '@/components/_ui/Flex';

export type InlineProps<E extends ElementType = 'div'> = Omit<FlexProps<E>, 'direction'>;

/** Horizontal shorthand — Flex with `direction="row"` and a default `align="center"`. */
export function Inline<E extends ElementType = 'div'>(props: InlineProps<E>) {
  const merged = { align: 'center', ...props } as FlexProps<E>;
  return <Flex direction="row" {...merged} />;
}
