import { ComponentProps } from 'react';

export type DotStatus = 'live' | 'idle' | 'error' | 'warning' | 'info';
export type DotSize = 'xs' | 'sm' | 'md';

/** Small semantic state indicator dot. */
export interface StatusDotProps extends Omit<ComponentProps<'span'>, 'style'> {
  status?: DotStatus;
  size?: DotSize;
  /** Pulse animation for live/running states. */
  pulse?: boolean;
  /** Override color (e.g. an agent hue). */
  color?: string | null;
  style?: React.CSSProperties;
}

export function StatusDot(props: StatusDotProps): JSX.Element;
