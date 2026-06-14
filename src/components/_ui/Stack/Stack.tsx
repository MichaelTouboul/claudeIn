import { type ElementType } from 'react';

import { Flex, type FlexProps } from '@/components/_ui/Flex';

export type StackProps<E extends ElementType = 'div'> = Omit<FlexProps<E>, 'direction'>;

/** Vertical shorthand — Flex with `direction="col"`. */
export function Stack<E extends ElementType = 'div'>(props: StackProps<E>) {
  return <Flex direction="col" {...(props as FlexProps<E>)} />;
}
