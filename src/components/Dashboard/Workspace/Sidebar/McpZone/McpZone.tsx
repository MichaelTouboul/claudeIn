import { Search } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/_ui/Input';
import type { McpServerEntry } from '@/lib/types';

import { McpRow } from '../McpRow/McpRow';

export type McpZoneProps = {
  mcp: McpServerEntry[];
};

/** Narrow an MCP list by a case-insensitive substring of name/transport/target. */
function filterMcp(mcp: McpServerEntry[], query: string): McpServerEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return mcp;
  return mcp.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.transport.toLowerCase().includes(q) ||
      m.target.toLowerCase().includes(q),
  );
}

/**
 * The drilled-in MCP servers list: a filter input above the redesigned MCP rows
 * — the same grammar as AgentsZone, keyed by `scope:name` (stable on reorder).
 */
export function McpZone({ mcp }: McpZoneProps) {
  const [query, setQuery] = useState('');
  const visible = filterMcp(mcp, query);

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-3 pb-2.5 pt-1">
        <Input
          size="sm"
          placeholder="Filter servers…"
          leadingIcon={<Search size={13} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter servers"
        />
      </div>
      <div className="flex-1 overflow-y-auto pt-0.5 space-y-0.5">
        {visible.length > 0 ? (
          visible.map((server) => <McpRow key={`${server.scope}:${server.name}`} server={server} />)
        ) : (
          <p className="px-3 py-6 text-center text-xs text-fg-muted">
            {mcp.length > 0 ? 'No matching servers' : 'No MCP servers'}
          </p>
        )}
      </div>
    </div>
  );
}
