import type { ReactNode } from 'react';

export type LauncherCardProps = {
  icon: string;
  title: string;
  description: string;
  expanded: boolean;
  onActivate: () => void;
  children?: ReactNode;
};

export function LauncherCard({ icon, title, description, expanded, onActivate, children }: LauncherCardProps) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3 transition-colors"
      style={{
        background: 'var(--color-surface-1)',
        border: `1px solid ${expanded ? 'var(--color-accent)' : 'var(--color-border)'}`,
      }}
    >
      <button
        onClick={onActivate}
        className="flex items-start gap-3 text-left"
        aria-expanded={expanded}
      >
        <span className="text-2xl leading-none shrink-0" aria-hidden>{icon}</span>
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
            {title}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {description}
          </span>
        </span>
      </button>
      {expanded && children ? <div>{children}</div> : null}
    </div>
  );
}
