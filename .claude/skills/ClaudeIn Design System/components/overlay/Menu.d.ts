import { ReactNode } from 'react';

export interface MenuItemSpec {
  label?: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  tone?: 'default' | 'danger';
  onSelect?: () => void;
  disabled?: boolean;
  /** Renders a divider instead of an item. */
  separator?: boolean;
}

/** Dropdown menu with self-managed open state. */
export interface MenuProps {
  /** The clickable trigger node. */
  trigger: ReactNode;
  items: MenuItemSpec[];
  /** Horizontal alignment of the panel relative to the trigger. */
  align?: 'start' | 'end';
  style?: React.CSSProperties;
}

export function Menu(props: MenuProps): JSX.Element;
