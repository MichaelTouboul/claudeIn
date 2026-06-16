import { ReactNode } from 'react';

export type DialogVariant = 'center' | 'drawer-right';

/** Modal dialog / right drawer with scrim, Esc + scrim-click close. */
export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  variant?: DialogVariant;
  /** Panel width in px. */
  width?: number;
  /** Footer node (e.g. action buttons), right-aligned. */
  footer?: ReactNode;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export function Dialog(props: DialogProps): JSX.Element | null;
