import type { McpServerEntry } from '@/types/mcp-mirror.types';

import { McpServerRow } from './McpServerRow';

export type McpViewProps = {
  servers: McpServerEntry[];
};

// Read-only list of the reconciled MCP servers (transport/provenance badges,
// target, shadowed dimming). The store owns the live wiring; this is purely
// presentational over the `servers` prop.
export function McpView({ servers }: McpViewProps) {
  if (servers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full" data-testid="mcp-view">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
          No MCP servers configured
        </p>
      </div>
    );
  }
  return (
    <div className="flex-1 h-full overflow-auto p-4" data-testid="mcp-view">
      <ul className="flex flex-col gap-2">
        {servers.map((server) => (
          <McpServerRow key={`${server.source}:${server.name}`} server={server} />
        ))}
      </ul>
    </div>
  );
}
