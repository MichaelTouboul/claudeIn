import { ReactNode } from 'react';

export interface SegmentOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
}

/** Compact segmented control for mutually-exclusive view modes / filters. */
export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
