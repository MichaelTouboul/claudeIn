import * as RadixTooltip from '@radix-ui/react-tooltip';
import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

export type TooltipProps = {
  /** The hover text. When empty, the trigger renders bare (no tooltip). */
  label: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  /** Open delay in ms (default: quick, 200ms). */
  delayDuration?: number;
  className?: string;
};

/**
 * A calm hover tooltip wrapping Radix Tooltip. Self-contained: it carries its
 * own `Provider` so callers can drop a single `<Tooltip>` anywhere without a
 * root provider. Styled from design tokens (surface-2 + hairline + popover
 * shadow), matching the Popover primitive.
 */
export function Tooltip({ label, children, side = 'top', delayDuration = 200, className }: TooltipProps) {
  if (!label) return <>{children}</>;
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            className={cn(
              'z-[80] max-w-xs rounded-md px-2.5 py-1.5 text-xs leading-snug select-none',
              className,
            )}
            style={{
              background: 'var(--color-surface-2)',
              color: 'var(--color-fg)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-popover)',
            }}
          >
            {label}
            <RadixTooltip.Arrow style={{ fill: 'var(--color-surface-2)' }} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
