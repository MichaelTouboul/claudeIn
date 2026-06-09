import type { McpServerEntry } from '@/types/mcp-mirror.types';

import { McpServerBadges } from './McpServerBadges';

export type McpServerRowProps = {
  server: McpServerEntry;
};

// One reconciled MCP server: name + provenance/transport badges + target.
// A `shadowed` server (a higher-precedence source defines the same name) is
// dimmed and carries an explicit "shadowed" tag.
export function McpServerRow({ server }: McpServerRowProps) {
  const opacity = server.shadowed ? 0.5 : 1;

  return (
    <li
      data-testid="mcp-server-row"
      data-shadowed={server.shadowed ? 'true' : 'false'}
      className="flex flex-col gap-1 rounded px-3 py-2"
      style={{
        opacity,
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}
        >
          {server.name}
        </span>
        <McpServerBadges server={server} />
        {server.shadowed ? (
          <span
            data-testid="mcp-shadowed-tag"
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] leading-none uppercase tracking-wide"
            style={{
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-surface-3)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            shadowed
          </span>
        ) : null}
      </div>
      {server.target.length > 0 ? (
        <code className="text-xs break-all" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {server.target}
        </code>
      ) : null}
    </li>
  );
}
