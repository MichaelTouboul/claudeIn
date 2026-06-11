import { Plus } from "lucide-react";

import type { McpServerEntry } from "@/types/mcp-mirror.types";

export type ConnectorServerListProps = {
  label: string;
  servers: McpServerEntry[];
  selectedKey: string | null;
  onSelect: (server: McpServerEntry) => void;
  onAdd: () => void;
};

export function serverKey(server: McpServerEntry): string {
  return `${server.source}:${server.name}`;
}

// One scope group in the Connectors sidebar: a header with a "+" add affordance
// and a selectable list of its MCP servers. Selecting a row opens its detail in
// the content pane; a shadowed server is dimmed.
export function ConnectorServerList({
  label,
  servers,
  selectedKey,
  onSelect,
  onAdd,
}: ConnectorServerListProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 px-1">
        <span
          className="text-[11px] uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-sans)" }}
        >
          {label}
        </span>
        <button
          type="button"
          aria-label={`Add ${label} MCP server`}
          onClick={onAdd}
          className="flex items-center justify-center rounded p-0.5"
          style={{ color: "var(--color-accent)" }}
        >
          <Plus size={14} />
        </button>
      </div>
      {servers.length === 0 ? (
        <p className="px-2 py-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
          No servers
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {servers.map((server) => {
            const key = serverKey(server);
            const selected = key === selectedKey;
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-current={selected}
                  data-testid="connector-server-item"
                  data-shadowed={server.shadowed ? "true" : "false"}
                  onClick={() => onSelect(server)}
                  className="w-full text-left rounded px-2 py-1.5 text-sm transition-colors"
                  style={{
                    opacity: server.shadowed ? 0.5 : 1,
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-sans)",
                    background: selected ? "var(--color-accent-dim)" : "transparent",
                  }}
                >
                  {server.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
