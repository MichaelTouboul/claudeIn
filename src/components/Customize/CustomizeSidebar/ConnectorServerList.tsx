import { Plug, Plus } from "lucide-react";

import { IconButton } from "@/components/_ui/IconButton";
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
          className="text-[11px] font-semibold uppercase"
          style={{
            color: "var(--color-text-muted)",
            letterSpacing: "0.08em",
            fontFamily: "var(--font-sans)",
          }}
        >
          {label}
        </span>
        <IconButton
          type="button"
          intent="ghost"
          size="sm"
          aria-label={`Add ${label} MCP server`}
          onClick={onAdd}
        >
          <Plus size={15} aria-hidden="true" />
        </IconButton>
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
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] hover:bg-surface-2"
                  style={{
                    opacity: server.shadowed ? 0.5 : 1,
                    background: selected ? "var(--color-surface-2)" : "transparent",
                    border: selected
                      ? "1px solid var(--color-accent)"
                      : "1px solid transparent",
                  }}
                >
                  <Plug
                    size={14}
                    aria-hidden="true"
                    style={{
                      color: selected ? "var(--color-accent)" : "var(--color-text-muted)",
                    }}
                  />
                  <span
                    className="flex-1 truncate text-xs"
                    style={{
                      color: selected ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {server.name}
                  </span>
                </button>
              </li>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
