import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AvatarHue } from '@/components/_ui/Avatar/Avatar';
import { Kbd } from '@/components/_ui/Kbd';
import { cn } from '@/lib/utils';

export type LauncherCardProps = {
  /** The lucide icon node rendered inside the hued tile. */
  icon: ReactNode;
  /** Hue of the icon tile (a `.agent-color-<hue>` token tint). */
  hue: AvatarHue;
  title: string;
  description: string;
  expanded: boolean;
  onActivate: () => void;
  /** Show a rotating chevron (this card is an expandable dropdown). */
  chevron?: boolean;
  /** Keyboard hint glyph shown at the trailing edge (e.g. D / A). */
  kbd?: string;
  children?: ReactNode;
};

/**
 * A new-tab launcher row: a hued icon tile, title + description, and a trailing
 * affordance (rotating chevron for a dropdown, or a Kbd shortcut hint). When
 * `expanded` the card outlines in the accent color and reveals its children.
 * Matches the design drop — icons (not emoji), tokens only.
 */
export function LauncherCard({
  icon,
  hue,
  title,
  description,
  expanded,
  onActivate,
  chevron = false,
  kbd,
  children,
}: LauncherCardProps) {
  return (
    <div
      className={cn('rounded-lg transition-colors', expanded && 'overflow-hidden')}
      style={{
        background: 'var(--color-surface-1)',
        border: `1px solid ${expanded ? 'var(--color-accent)' : 'var(--color-border)'}`,
      }}
    >
      <button
        type="button"
        onClick={onActivate}
        aria-expanded={chevron ? expanded : undefined}
        className="flex w-full items-center gap-3.5 p-4 text-left transition-colors"
        style={expanded ? { borderBottom: '1px solid var(--color-border-subtle)' } : undefined}
        onMouseEnter={(e) => (e.currentTarget.style.background = expanded ? '' : 'var(--color-surface-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
      >
        <span
          className={cn('inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md', `agent-color-${hue}`)}
          style={{
            background: 'color-mix(in srgb, var(--agent-color) 16%, var(--color-surface-2))',
            border: '1px solid color-mix(in srgb, var(--agent-color) 30%, transparent)',
            color: 'var(--agent-color)',
          }}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </span>
          <span className="mt-0.5 block text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </span>
        </span>
        {chevron ? (
          <ChevronDown
            size={18}
            style={{
              color: 'var(--color-text-muted)',
              transform: expanded ? 'none' : 'rotate(-90deg)',
              transition: 'transform var(--duration-fast)',
            }}
          />
        ) : null}
        {kbd ? <Kbd>{kbd}</Kbd> : null}
      </button>
      {expanded && children ? <div>{children}</div> : null}
    </div>
  );
}
