import type { McpServerEntry } from '@/types/mcp-mirror.types';

export type McpViewProps = {
  servers: McpServerEntry[];
};

// Minimal read-only list of the reconciled MCP servers. Phase 3 fleshes this out
// with transport/provenance badges, target, and shadowed dimming; for now it
// renders the server names (or an empty state) so the tab routing is testable.
export function McpView({ servers }: McpViewProps) {
  if (servers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full" data-testid="mcp-view">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
          No MCP servers configured.
        </p>
      </div>
    );
  }
  return (
    <div className="flex-1 h-full overflow-auto p-4" data-testid="mcp-view">
      <ul className="flex flex-col gap-1">
        {servers.map((server) => (
          <li
            key={`${server.source}:${server.name}`}
            className="text-sm"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
          >
            {server.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
