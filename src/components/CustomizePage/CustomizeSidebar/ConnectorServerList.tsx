import { Plus } from "lucide-react";

import type { McpServerEntry } from "@/lib/types";

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
// and a selectable list of its MCP servers. The list is an ARIA `listbox`
// (named by its group header) and each row is an `option` carrying
// `aria-selected`; selecting one opens its detail in the content pane. A shadowed
// server is dimmed and its name carries a title hint. Empty scopes show a clear
// "no connectors yet" hint inviting the "+" add.
export function ConnectorServerList({
  label,
  servers,
  selectedKey,
  onSelect,
  onAdd,
}: ConnectorServerListProps) {
  const labelId = `connector-group-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 px-1">
        <span
          id={labelId}
          className="text-[11px] uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-sans)" }}
        >
          {label}
        </span>
        <button
          type="button"
          aria-label={`Add ${label} MCP server`}
          onClick={onAdd}
          className="flex items-center justify-center rounded p-0.5 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          style={{ color: "var(--color-accent)" }}
        >
          <Plus size={14} />
        </button>
      </div>
      {servers.length === 0 ? (
        <p
          className="px-2 py-1.5 text-xs leading-relaxed"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-sans)" }}
        >
          No connectors yet — use <span aria-hidden>＋</span> to add one.
        </p>
      ) : (
        <ul role="listbox" aria-labelledby={labelId} className="flex flex-col gap-0.5">
          {servers.map((server) => {
            const key = serverKey(server);
            const selected = key === selectedKey;
            return (
              <li key={key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  title={server.shadowed ? `${server.name} (shadowed by a higher-scope server)` : undefined}
                  data-testid="connector-server-item"
                  data-shadowed={server.shadowed ? "true" : "false"}
                  onClick={() => onSelect(server)}
                  className="w-full text-left rounded px-2 py-1.5 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
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
