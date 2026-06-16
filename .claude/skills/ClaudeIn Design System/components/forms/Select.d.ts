import { ComponentProps, ReactNode } from 'react';

export type SelectSize = 'sm' | 'md' | 'lg';
export interface SelectOption {
  value: string;
  label: string;
}

/** Styled native select with a custom chevron. */
export interface SelectProps extends Omit<ComponentProps<'select'>, 'size' | 'style'> {
  size?: SelectSize;
  invalid?: boolean;
  /** Options as data; alternatively pass <option> children. */
  options?: SelectOption[] | null;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export function Select(props: SelectProps): JSX.Element;
