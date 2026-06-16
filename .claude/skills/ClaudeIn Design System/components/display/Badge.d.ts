import { ComponentProps, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'history';
export type BadgeShape = 'rounded' | 'pill';

/**
 * Compact status / category label.
 *
 * @startingPoint section="Data display" subtitle="Status & category badges" viewport="700x140"
 */
export interface BadgeProps extends Omit<ComponentProps<'span'>, 'style'> {
  tone?: BadgeTone;
  shape?: BadgeShape;
  /** Mono face (default true) for machine values; false for words. */
  mono?: boolean;
  /** Leading status dot. */
  dot?: boolean;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
