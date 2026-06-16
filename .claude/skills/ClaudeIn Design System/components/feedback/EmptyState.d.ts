import { ComponentProps, ReactNode } from 'react';

/** Centered zero-state for empty lists / panels. */
export interface EmptyStateProps extends Omit<ComponentProps<'div'>, 'style' | 'title'> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  style?: React.CSSProperties;
}

export function EmptyState(props: EmptyStateProps): JSX.Element;
