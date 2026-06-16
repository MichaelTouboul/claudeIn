import { ComponentProps, ReactNode } from 'react';

export type IconButtonIntent = 'primary' | 'outline' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

/**
 * Square icon-only button (toolbar actions, close buttons, row controls).
 * Always supply `aria-label`.
 */
export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'style'> {
  intent?: IconButtonIntent;
  size?: IconButtonSize;
  /** Toggled/selected state (ghost intent only). */
  active?: boolean;
  /** The icon node. */
  children?: ReactNode;
  style?: React.CSSProperties;
}

export function IconButton(props: IconButtonProps): JSX.Element;
