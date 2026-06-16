import { ComponentProps, ReactNode } from 'react';

/** Selectable / removable chip for filters, attachments, selections. */
export interface TagProps extends Omit<ComponentProps<'span'>, 'style'> {
  selected?: boolean;
  /** When provided, renders an × button and calls this on click. */
  onRemove?: ((e: React.MouseEvent) => void) | null;
  leadingIcon?: ReactNode;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export function Tag(props: TagProps): JSX.Element;
