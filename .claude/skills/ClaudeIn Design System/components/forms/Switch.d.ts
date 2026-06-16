import { ComponentProps, ReactNode } from 'react';

/** On/off toggle switch with optional inline label. */
export interface SwitchProps extends Omit<ComponentProps<'input'>, 'type' | 'style'> {
  checked?: boolean;
  label?: ReactNode;
  style?: React.CSSProperties;
}

export function Switch(props: SwitchProps): JSX.Element;
