import { ComponentProps, ReactNode } from 'react';

/** Checkbox with an inline label. */
export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type' | 'style'> {
  checked?: boolean;
  indeterminate?: boolean;
  /** Inline label content. */
  label?: ReactNode;
  style?: React.CSSProperties;
}

export function Checkbox(props: CheckboxProps): JSX.Element;
