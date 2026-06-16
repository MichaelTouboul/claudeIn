import { Plug } from 'lucide-react';

import { Badge } from '@/components/_ui/Badge';
import type { McpServerEntry } from '@/lib/types';

import { LibraryTile } from '../LibraryNav/LibraryTile/LibraryTile';
import { ItemScope, ScopeBadge } from '../LibraryNav/ScopeBadge/ScopeBadge';

export type McpRowProps = {
  server: McpServerEntry;
};

/**
 * A redesigned Library MCP server row (library.html grammar): an accent-tinted
 * tile, the server name + a transport Badge on the primary line, the target on
 * the secondary line, and a scope badge. MCP has no favorite/edit actions wired
 * yet, so no More menu (its data is the static config mirror only).
 */
export function McpRow({ server }: McpRowProps) {
  const scope = server.scope === 'project' ? ItemScope.Project : ItemScope.User;
  return (
    <div className="group flex items-center gap-2.5 px-2.5 py-2 mx-2 rounded-md overflow-hidden hover:bg-surface-2 transition-colors">
      <LibraryTile icon={<Plug size={15} />} color="var(--color-accent-text)" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium font-mono" style={{ color: 'var(--color-fg)' }}>
            {server.name}
          </span>
          <Badge variant="gray">{server.transport}</Badge>
        </div>
        {server.target ? (
          <span className="block truncate text-xs font-mono mt-px" style={{ color: 'var(--color-text-muted)' }}>
            {server.target}
          </span>
        ) : null}
      </div>
      <ScopeBadge scope={scope} />
    </div>
  );
}
