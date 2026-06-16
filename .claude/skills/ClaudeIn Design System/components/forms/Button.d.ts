import { ComponentProps, ReactNode } from 'react';

export type ButtonIntent = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-solid';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Primary action control for ClaudeIn. Indigo `primary` for the single main
 * action per view; `secondary`/`ghost`/`outline` for everything else.
 *
 * @startingPoint section="Forms" subtitle="Button with all intents & sizes" viewport="700x180"
 */
export interface ButtonProps extends Omit<ComponentProps<'button'>, 'style'> {
  /** Visual weight / role. Use `primary` sparingly — one per view. */
  intent?: ButtonIntent;
  /** Control height. `md` (36px) default; `lg` (44px) for hero CTAs. */
  size?: ButtonSize;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  /** Show a spinner and disable interaction. */
  loading?: boolean;
  /** Icon node rendered before the label. */
  leftIcon?: ReactNode;
  /** Icon node rendered after the label. */
  rightIcon?: ReactNode;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
