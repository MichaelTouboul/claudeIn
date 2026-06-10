import type { McpServerEntry } from '@/types/mcp-mirror.types';

import { McpRestartBanner } from './McpRestartBanner';
import { McpServerRow } from './McpServerRow';
import { useMcpManage } from './useMcpManage';

export type McpViewProps = {
  servers: McpServerEntry[];
  projectPath?: string;
};

// List of the reconciled MCP servers (transport/provenance badges, target,
// shadowed dimming) with per-row view-raw + remove. The manage hook is owned
// here so the "restart sessions" banner reflects any row's successful mutation.
export function McpView({ servers, projectPath }: McpViewProps) {
  const { getRaw, remove, needsRestart, error } = useMcpManage();

  if (servers.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full" data-testid="mcp-view">
        {needsRestart ? <McpRestartBanner /> : null}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
            No MCP servers configured
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 h-full overflow-auto p-4 flex flex-col gap-2" data-testid="mcp-view">
      {needsRestart ? <McpRestartBanner /> : null}
      {error !== null ? (
        <p
          role="alert"
          className="text-xs rounded px-3 py-2"
          style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-surface-2)', fontFamily: 'var(--font-mono)' }}
        >
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {servers.map((server) => (
          <McpServerRow
            key={`${server.source}:${server.name}`}
            server={server}
            getRaw={getRaw}
            remove={remove}
            projectPath={projectPath}
          />
        ))}
      </ul>
    </div>
  );
}
