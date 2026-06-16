import { Plug } from 'lucide-react';

import type { McpServerEntry } from '@/lib/types';

export type McpRowProps = {
  server: McpServerEntry;
};

/**
 * A single MCP server row. The MCP mirror data already lives in the dashboard
 * store; before the switch it had no sidebar surface — this row makes it
 * reachable from the Library. Shows the server name + its transport/target.
 * The polished tiles/detail come in a later phase.
 */
export function McpRow({ server }: McpRowProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
      <Plug size={11} className="shrink-0" style={{ color: 'var(--color-accent-text)' }} />
      <span className="font-medium text-fg truncate">{server.name}</span>
      <span className="font-mono text-fg-subtle shrink-0">{server.transport}</span>
      {server.target ? (
        <span className="font-mono text-fg-muted truncate">{server.target}</span>
      ) : null}
    </div>
  );
}
