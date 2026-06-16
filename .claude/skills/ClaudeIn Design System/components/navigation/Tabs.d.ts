import { ReactNode } from 'react';

export interface TabItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number | null;
}

/**
 * Underline tab bar.
 *
 * @startingPoint section="Navigation" subtitle="Underline tab bar with counts" viewport="700x120"
 */
export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

export function Tabs(props: TabsProps): JSX.Element;
