import { useState } from 'react';

import type { McpServerEntry } from '@/types/mcp-mirror.types';

import { McpAddDialog } from './McpAddDialog';
import { McpRestartBanner } from './McpRestartBanner';
import { McpServerRow } from './McpServerRow';
import { useMcpManage } from './useMcpManage';

export type McpViewProps = {
  servers: McpServerEntry[];
  projectPath?: string;
};

const addButtonStyle = {
  color: 'var(--color-accent)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface-2)',
  fontFamily: 'var(--font-sans)',
} as const;

// List of the reconciled MCP servers (transport/provenance badges, target,
// shadowed dimming) with per-row view-raw + remove. The manage hook is owned
// here so the "restart sessions" banner reflects any row's successful mutation.
export function McpView({ servers, projectPath }: McpViewProps) {
  const { getRaw, add, edit, remove, needsRestart, error } = useMcpManage();
  const [addOpen, setAddOpen] = useState(false);

  const header = (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
        MCP servers
      </span>
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="text-xs leading-none rounded px-2 py-1"
        style={addButtonStyle}
      >
        Add MCP server
      </button>
    </div>
  );

  const addDialog = (
    <McpAddDialog
      mode="add"
      open={addOpen}
      onOpenChange={setAddOpen}
      onSubmit={(input) => add({ ...input, projectPath: input.projectPath ?? projectPath })}
    />
  );

  if (servers.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full p-4 gap-2" data-testid="mcp-view">
        {needsRestart ? <McpRestartBanner /> : null}
        {header}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
            No MCP servers configured
          </p>
        </div>
        {addDialog}
      </div>
    );
  }
  return (
    <div className="flex-1 h-full overflow-auto p-4 flex flex-col gap-2" data-testid="mcp-view">
      {needsRestart ? <McpRestartBanner /> : null}
      {header}
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
            edit={edit}
            projectPath={projectPath}
          />
        ))}
      </ul>
      {addDialog}
    </div>
  );
}
