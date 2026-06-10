import { useState } from 'react';

import type {
  McpManageScope,
  McpMutationResult,
  McpServerRaw,
} from '@/types/mcp-manage.types';
import type { McpServerEntry } from '@/types/mcp-mirror.types';

import { McpRawConfig } from './McpRawConfig';
import { McpRemoveDialog } from './McpRemoveDialog';
import { McpServerBadges } from './McpServerBadges';

export type McpServerRowProps = {
  server: McpServerEntry;
  getRaw: (name: string, scope?: McpManageScope, projectPath?: string) => Promise<McpServerRaw>;
  remove: (name: string, scope: McpManageScope, projectPath?: string) => Promise<McpMutationResult>;
  projectPath?: string;
};

// One reconciled MCP server: name + provenance/transport badges + target, plus
// an expand affordance that lazily fetches the full raw config and a Remove
// action guarded by a confirm dialog. A `shadowed` server (a higher-precedence
// source defines the same name) is dimmed and carries an explicit "shadowed" tag.
export function McpServerRow({ server, getRaw, remove, projectPath }: McpServerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [raw, setRaw] = useState<McpServerRaw | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const opacity = server.shadowed ? 0.5 : 1;

  const toggleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (raw === null) {
      setRaw(await getRaw(server.name, server.scope, projectPath));
    }
  };

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
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`Show raw config for ${server.name}`}
          onClick={() => void toggleExpand()}
          className="text-xs leading-none rounded px-1 py-0.5"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          {expanded ? '▾' : '▸'}
        </button>
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
        <button
          type="button"
          aria-label={`Remove ${server.name}`}
          onClick={() => setConfirmOpen(true)}
          className="ml-auto text-xs leading-none rounded px-2 py-0.5 transition-colors"
          style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-sans)' }}
        >
          Remove
        </button>
      </div>
      {server.target.length > 0 ? (
        <code className="text-xs break-all" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {server.target}
        </code>
      ) : null}
      {expanded && raw !== null ? <McpRawConfig raw={raw} /> : null}
      <McpRemoveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        serverName={server.name}
        onConfirm={() => remove(server.name, server.scope, projectPath)}
      />
    </li>
  );
}
