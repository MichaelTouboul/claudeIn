import { type ReactNode } from 'react';

export type ConfigRowProps = {
  label: string;
  /** When true, render the muted "Inherited" marker instead of `children`. */
  inherited?: boolean;
  children?: ReactNode;
};

/** A single Configuration row: label on the left, value (or "Inherited") on the right. */
export function ConfigRow({ label, inherited = false, children }: ConfigRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-subtle py-2.5 last:border-b-0">
      <span className="whitespace-nowrap text-[13px] text-fg-subtle">{label}</span>
      {inherited ? (
        <span className="text-xs text-fg-subtle">Inherited</span>
      ) : (
        <span className="text-right font-mono text-[13px] text-fg">{children}</span>
      )}
    </div>
  );
}
