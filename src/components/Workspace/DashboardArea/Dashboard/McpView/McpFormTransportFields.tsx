import type { CSSProperties, ReactNode } from "react";

import type { McpTransportInput } from "@/types/mcp-manage.types";

import type { McpFormState } from "./mcpFormParse";

export type McpFormTransportFieldsProps = {
  state: McpFormState;
  patch: (next: Partial<McpFormState>) => void;
  labelStyle: CSSProperties;
  controlStyle: CSSProperties;
};

// Behavior-per-transport: the chosen transport selects exactly one field group
// (stdio → command/args/env; http/sse → url/headers). Every transport has an
// explicit renderer — no fallback chain.
const fieldsByTransport: Record<McpTransportInput, (props: McpFormTransportFieldsProps) => ReactNode> =
  {
    stdio: ({ state, patch, labelStyle, controlStyle }) => (
      <>
        <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
          Command
          <input
            type="text"
            value={state.command}
            onChange={(e) => patch({ command: e.target.value })}
            className="rounded px-2 py-1 text-xs"
            style={controlStyle}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
          Args
          <input
            type="text"
            value={state.argsText}
            onChange={(e) => patch({ argsText: e.target.value })}
            placeholder="-y @scope/pkg"
            className="rounded px-2 py-1 text-xs"
            style={controlStyle}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
          Env
          <textarea
            value={state.envText}
            onChange={(e) => patch({ envText: e.target.value })}
            placeholder="KEY=value"
            rows={2}
            className="rounded px-2 py-1 text-xs"
            style={controlStyle}
          />
        </label>
      </>
    ),
    http: (props) => <HttpFields {...props} />,
    sse: (props) => <HttpFields {...props} />,
  };

function HttpFields({ state, patch, labelStyle, controlStyle }: McpFormTransportFieldsProps): ReactNode {
  return (
    <>
      <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
        URL
        <input
          type="text"
          value={state.url}
          onChange={(e) => patch({ url: e.target.value })}
          placeholder="https://host/mcp"
          className="rounded px-2 py-1 text-xs"
          style={controlStyle}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
        Headers
        <textarea
          value={state.headersText}
          onChange={(e) => patch({ headersText: e.target.value })}
          placeholder="Authorization=Bearer token"
          rows={2}
          className="rounded px-2 py-1 text-xs"
          style={controlStyle}
        />
      </label>
    </>
  );
}

export function McpFormTransportFields(props: McpFormTransportFieldsProps) {
  return <>{fieldsByTransport[props.state.transport](props)}</>;
}
