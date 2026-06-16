import { Bot } from 'lucide-react';

import { StatusDot } from '@/components/_ui/StatusDot';

const AGENT_COLORS = new Set([
  'cyan', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'pink',
]);

/** Map an arbitrary frontmatter color to a known agent hue (fallback: purple). */
function hueClass(color: string | undefined): string {
  return `agent-color-${color && AGENT_COLORS.has(color) ? color : 'purple'}`;
}

export type IdentityTileProps = {
  /** frontmatter color name (cyan/blue/…); unknown values fall back to a hue. */
  color: string | undefined;
};

/**
 * The 46×46 hue-tinted identity tile from the agent-config design: bot glyph on
 * a `color-mix` tint of the agent hue, with an idle status dot at the corner.
 * The hue comes from the `.agent-color-*` token class — no raw colors.
 */
export function IdentityTile({ color }: IdentityTileProps) {
  return (
    <span
      className={`${hueClass(color)} relative flex shrink-0 items-center justify-center rounded-lg`}
      style={{
        width: 46,
        height: 46,
        background: 'color-mix(in srgb, var(--agent-color) 16%, var(--color-surface-2))',
        border: '1px solid color-mix(in srgb, var(--agent-color) 32%, transparent)',
        color: 'var(--agent-color)',
      }}
    >
      <Bot size={24} />
      <StatusDot
        aria-hidden="true"
        className="absolute -top-1 -right-1 h-3 w-3 bg-fg-subtle"
        style={{ border: '2px solid var(--color-surface-0)' }}
      />
    </span>
  );
}
