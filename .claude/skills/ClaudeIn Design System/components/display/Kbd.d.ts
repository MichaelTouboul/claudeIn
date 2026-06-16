import { ComponentProps, ReactNode } from 'react';

/** Keyboard key cap for shortcut hints. */
export interface KbdProps extends Omit<ComponentProps<'kbd'>, 'style'> {
  children?: ReactNode;
  style?: React.CSSProperties;
}

export function Kbd(props: KbdProps): JSX.Element;
