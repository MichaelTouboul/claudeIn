import { ComponentProps } from 'react';

/** Linear progress indicator. Omit `value` for indeterminate. */
export interface ProgressBarProps extends Omit<ComponentProps<'div'>, 'style'> {
  /** 0–100. `null`/omitted = indeterminate. */
  value?: number | null;
  /** Track + fill height in px. */
  height?: number;
  /** Fill color. */
  color?: string;
  style?: React.CSSProperties;
}

export function ProgressBar(props: ProgressBarProps): JSX.Element;
