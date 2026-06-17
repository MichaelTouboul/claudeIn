import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type ChipProps = ComponentProps<'span'>;

/**
 * Inline mono token — a tight, non-interactive code chip for technical
 * identifiers embedded in prose (agent names, MCP permission/tool names).
 * Surface-2 fill, subtle border, extra-small radius, Geist Mono. Generic and
 * token-driven — no domain knowledge. Distinct from `Tag` (sized/interactive).
 */
export function Chip({ className, children, ...props }: ChipProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline whitespace-nowrap rounded-[var(--radius-xs)] border border-border bg-surface-2 px-1.5 py-px font-mono text-[12.5px] text-fg',
        className,
      )}
    >
      {children}
    </span>
  );
}
