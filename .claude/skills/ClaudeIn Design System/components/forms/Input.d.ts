import { ComponentProps, ReactNode } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Single-line text input with optional adornments and error state.
 *
 * @startingPoint section="Forms" subtitle="Text field + adornments + states" viewport="700x150"
 */
export interface InputProps extends Omit<ComponentProps<'input'>, 'size' | 'style'> {
  size?: InputSize;
  /** Error styling (red outline). Pair with aria-invalid. */
  invalid?: boolean;
  /** Icon node before the value. */
  leadingIcon?: ReactNode;
  /** Icon node after the value. */
  trailingIcon?: ReactNode;
  /** Render value in the mono face (paths, IDs, tokens). */
  mono?: boolean;
  style?: React.CSSProperties;
}

export function Input(props: InputProps): JSX.Element;
