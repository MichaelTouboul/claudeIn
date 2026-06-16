import { ComponentProps } from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';
export type AgentHue = 'cyan' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'pink';

/** Identity avatar — image or tinted initials fallback. */
export interface AvatarProps extends Omit<ComponentProps<'span'>, 'style'> {
  name?: string;
  src?: string | null;
  size?: AvatarSize;
  /** Agent color used to tint the initials fallback. */
  hue?: AgentHue;
  /** Rounded-square instead of circle. */
  square?: boolean;
  style?: React.CSSProperties;
}

export function Avatar(props: AvatarProps): JSX.Element;
