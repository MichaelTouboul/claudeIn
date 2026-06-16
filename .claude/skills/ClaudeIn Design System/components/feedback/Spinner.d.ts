import { ComponentProps } from 'react';

/** Indeterminate loading spinner. */
export interface SpinnerProps extends Omit<ComponentProps<'span'>, 'style'> {
  /** Diameter in px. */
  size?: number;
  /** Stroke color (any CSS color / var). */
  color?: string;
  /** Ring thickness in px. */
  thickness?: number;
  style?: React.CSSProperties;
}

export function Spinner(props: SpinnerProps): JSX.Element;
