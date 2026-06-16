import { ComponentProps, ReactNode } from 'react';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/** Inline contextual message / alert. */
export interface BannerProps extends Omit<ComponentProps<'div'>, 'style' | 'title'> {
  tone?: BannerTone;
  /** Leading icon node. */
  icon?: ReactNode;
  /** Bold title line above the body. */
  title?: ReactNode;
  /** Trailing action node (e.g. a Button). */
  action?: ReactNode;
  style?: React.CSSProperties;
}

export function Banner(props: BannerProps): JSX.Element;
