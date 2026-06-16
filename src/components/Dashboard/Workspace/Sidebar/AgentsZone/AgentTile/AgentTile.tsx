import { Bot } from 'lucide-react';

import { StatusDot } from '@/components/_ui/StatusDot';

const AGENT_COLORS = new Set([
  'cyan', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'pink',
]);

/** Map an arbitrary frontmatter color to a known agent hue (fallback: purple). */
function hueClass(color: string | undefined): string {
  return `agent-color-${color && AGENT_COLORS.has(color) ? color : 'purple'}`;
}

export type AgentTileProps = {
  /** frontmatter color name (cyan/blue/…); unknown values fall back to a hue. */
  color: string | undefined;
  /** When live, render the success running-indicator dot at the top-right. */
  running: boolean;
};

/**
 * The 30×30 rounded, hue-tinted agent avatar tile. The hue comes from the
 * `.agent-color-*` token class (sets `--agent-color`), so the `color-mix`
 * tint/border reference a design-system token, never a raw value.
 */
export function AgentTile({ color, running }: AgentTileProps) {
  return (
    <span
      className={`${hueClass(color)} relative flex shrink-0 items-center justify-center rounded-md`}
      style={{
        width: 30,
        height: 30,
        background: 'color-mix(in srgb, var(--agent-color) 16%, var(--color-surface-2))',
        border: '1px solid color-mix(in srgb, var(--agent-color) 32%, transparent)',
        color: 'var(--agent-color)',
      }}
    >
      <Bot size={16} />
      {running ? (
        <StatusDot
          aria-label="running"
          className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-active"
          style={{ border: '2px solid var(--color-surface-1)' }}
        />
      ) : null}
    </span>
  );
}
