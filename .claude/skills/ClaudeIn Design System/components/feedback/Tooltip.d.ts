import { ReactNode } from 'react';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

/** Hover/focus tooltip wrapping a single trigger child. */
export interface TooltipProps {
  /** Tooltip text/content. */
  label: ReactNode;
  side?: TooltipSide;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function Tooltip(props: TooltipProps): JSX.Element;
