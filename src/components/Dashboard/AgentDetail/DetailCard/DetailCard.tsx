import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type DetailCardProps = {
  icon: ReactNode;
  title: string;
  /** Optional trailing slot in the card header (count, copy button, …). */
  action?: ReactNode;
  /** Drop the default body padding (rows manage their own). */
  flush?: boolean;
  children: ReactNode;
};

/** Card shell used across the agent-config rail and main column. */
export function DetailCard({ icon, title, action, flush = false, children }: DetailCardProps) {
  return (
    <div
      className="rounded-lg border border-border"
      style={{ background: 'var(--color-surface-1)' }}
    >
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3.5">
        <span className="flex text-fg-subtle">{icon}</span>
        <span
          className="whitespace-nowrap text-[13px] font-semibold text-fg"
          style={{ letterSpacing: '0.02em' }}
        >
          {title}
        </span>
        {action ? <span className="ml-auto flex items-center">{action}</span> : null}
      </div>
      <div className={cn(flush ? 'px-4' : 'p-4')}>{children}</div>
    </div>
  );
}
