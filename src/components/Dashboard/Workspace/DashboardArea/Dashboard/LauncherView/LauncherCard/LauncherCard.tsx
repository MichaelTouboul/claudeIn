import type { ReactNode } from 'react';

import { Inline } from '@/components/_ui/Inline';
import { Stack } from '@/components/_ui/Stack';

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
    <Stack
      gap={3}
      className="rounded-lg p-4 transition-colors"
      style={{
        background: 'var(--color-surface-1)',
        border: `1px solid ${expanded ? 'var(--color-accent)' : 'var(--color-border)'}`,
      }}
    >
      <Inline
        as="button"
        gap={3}
        align="start"
        onClick={onActivate}
        className="text-left"
        aria-expanded={expanded}
      >
        <span className="text-2xl leading-none shrink-0" aria-hidden>{icon}</span>
        <Stack as="span" gap={0.5} className="min-w-0">
          <span className="text-sm" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
            {title}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {description}
          </span>
        </Stack>
      </Inline>
      {expanded && children ? <div>{children}</div> : null}
    </Stack>
  );
}
