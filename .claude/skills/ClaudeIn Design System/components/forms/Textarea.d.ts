import { ComponentProps } from 'react';

/** Multi-line text field. */
export interface TextareaProps extends Omit<ComponentProps<'textarea'>, 'style'> {
  invalid?: boolean;
  /** Render content in the mono face. */
  mono?: boolean;
  style?: React.CSSProperties;
}

export function Textarea(props: TextareaProps): JSX.Element;
