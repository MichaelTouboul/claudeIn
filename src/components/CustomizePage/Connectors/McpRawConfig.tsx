import type { ReactNode } from "react";

import type { McpServerRaw } from "@/lib/types";

export type McpRawConfigProps = {
  raw: McpServerRaw;
};

const labelStyle = {
  color: "var(--color-text-muted)",
  fontFamily: "var(--font-sans)",
} as const;

const valueStyle = {
  color: "var(--color-text-secondary)",
  fontFamily: "var(--font-mono)",
} as const;

function Field({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide" style={labelStyle}>
        {label}
      </span>
      <code className="text-xs break-all" style={valueStyle}>
        {value}
      </code>
    </div>
  );
}

function KeyValueList({ label, entries }: { label: string; entries: [string, string][] }): ReactNode {
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide" style={labelStyle}>
        {label}
      </span>
      <ul className="flex flex-col gap-0.5">
        {entries.map(([key, val]) => (
          <li key={key} className="flex gap-2 text-xs">
            <code style={{ ...valueStyle, color: "var(--color-text-primary)" }}>{key}</code>
            <code style={valueStyle} className="break-all">
              {val}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Behavior-per-transport: which fields a raw config renders. stdio shows
// command/args/env; http and sse show url/headers. No fallback chain.
const sectionsByTransport: Record<"stdio" | "http" | "sse", (raw: McpServerRaw) => ReactNode> = {
  stdio: (raw) => (
    <>
      {raw.command !== undefined ? <Field label="command" value={raw.command} /> : null}
      {raw.args !== undefined && raw.args.length > 0 ? (
        <Field label="args" value={raw.args.join(" ")} />
      ) : null}
      <KeyValueList label="env" entries={Object.entries(raw.env ?? {})} />
    </>
  ),
  http: (raw) => (
    <>
      {raw.url !== undefined ? <Field label="url" value={raw.url} /> : null}
      <KeyValueList label="headers" entries={Object.entries(raw.headers ?? {})} />
    </>
  ),
  sse: (raw) => (
    <>
      {raw.url !== undefined ? <Field label="url" value={raw.url} /> : null}
      <KeyValueList label="headers" entries={Object.entries(raw.headers ?? {})} />
    </>
  ),
};

function isKnownTransport(t: string): t is "stdio" | "http" | "sse" {
  return t === "stdio" || t === "http" || t === "sse";
}

// Read-only render of a server's full raw config (from `claude mcp get`).
export function McpRawConfig({ raw }: McpRawConfigProps) {
  const render = isKnownTransport(raw.transport) ? sectionsByTransport[raw.transport] : null;
  return (
    <div
      data-testid="mcp-raw-config"
      className="flex flex-col gap-2 rounded px-3 py-2"
      style={{ backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)" }}
    >
      {render !== null ? render(raw) : null}
    </div>
  );
}
