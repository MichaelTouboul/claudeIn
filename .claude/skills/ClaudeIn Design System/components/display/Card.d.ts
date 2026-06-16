import { ComponentProps, ReactNode } from 'react';

/**
 * Surface container with the standard card border, radius, and elevation.
 *
 * @startingPoint section="Layout" subtitle="Card surface (static & interactive)" viewport="700x200"
 */
export interface CardProps extends Omit<ComponentProps<'div'>, 'style'> {
  /** Adds hover lift + pointer cursor. */
  interactive?: boolean;
  /** Accent border to mark the selected card. */
  selected?: boolean;
  /** CSS padding value (e.g. 'var(--space-4)'). */
  padding?: string;
  /** Element tag to render. */
  as?: keyof JSX.IntrinsicElements;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export function Card(props: CardProps): JSX.Element;
