import type { CSSProperties } from 'react';

import type { McpServerEntry } from '@/types/mcp-mirror.types';

import { SOURCE_PRESENTATION, TRANSPORT_PRESENTATION } from './mcpPresentation';

export type McpServerBadgesProps = {
  server: McpServerEntry;
};

const badgeBase = 'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] leading-none';

// Transport + provenance badges. Both labels come from the explicit behavior
// maps (no fallback chain) — `unknown` transport is a real map entry.
export function McpServerBadges({ server }: McpServerBadgesProps) {
  const transport = TRANSPORT_PRESENTATION[server.transport];
  const source = SOURCE_PRESENTATION[server.source];

  const transportStyle: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    color: transport.colorVar ? `var(${transport.colorVar})` : 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-surface-3)',
    border: '1px solid var(--color-border)',
  };
  const sourceStyle: CSSProperties = {
    fontFamily: 'var(--font-sans)',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border-subtle)',
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={badgeBase} style={transportStyle} data-testid="mcp-transport-badge">
        {transport.label}
      </span>
      <span className={badgeBase} style={sourceStyle} data-testid="mcp-source-badge">
        {source.label}
      </span>
    </span>
  );
}
