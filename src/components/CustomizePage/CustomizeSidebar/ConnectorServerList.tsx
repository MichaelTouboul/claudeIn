import { Plus } from "lucide-react";

import { Button } from "@/components/_ui/Button";
import { Inline } from "@/components/_ui/Inline";
import { Stack } from "@/components/_ui/Stack";
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
    <Stack gap={1}>
      <Inline gap={2} justify="between" className="px-1">
        <span
          id={labelId}
          className="text-[11px] uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-sans)" }}
        >
          {label}
        </span>
        <Button
          type="button"
          intent="ghost"
          size="icon"
          aria-label={`Add ${label} MCP server`}
          onClick={onAdd}
          className="h-auto w-auto p-0.5 text-accent hover:text-accent"
        >
          <Plus size={14} />
        </Button>
      </Inline>
      {servers.length === 0 ? (
        <p
          className="px-2 py-1.5 text-xs leading-relaxed"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-sans)" }}
        >
          No connectors yet — use <span aria-hidden>＋</span> to add one.
        </p>
      ) : (
        <Stack as="ul" gap={0.5} role="listbox" aria-labelledby={labelId}>
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
        </Stack>
      )}
    </Stack>
  );
}
