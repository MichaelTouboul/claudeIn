import type { CSSProperties, ReactNode } from "react";

import { Input } from "@/components/_ui/Input";
import { Textarea } from "@/components/_ui/Textarea";
import type { McpTransportInput } from "@/lib/types";

import type { McpFormState } from "./mcpFormParse";

export type McpFormTransportFieldsProps = {
  state: McpFormState;
  patch: (next: Partial<McpFormState>) => void;
  labelStyle: CSSProperties;
};

// Behavior-per-transport: the chosen transport selects exactly one field group
// (stdio → command/args/env; http/sse → url/headers). Every transport has an
// explicit renderer — no fallback chain.
const fieldsByTransport: Record<McpTransportInput, (props: McpFormTransportFieldsProps) => ReactNode> =
  {
    stdio: ({ state, patch, labelStyle }) => (
      <>
        <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
          Command
          <Input
            type="text"
            size="sm"
            font="mono"
            value={state.command}
            onChange={(e) => patch({ command: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
          Args
          <Input
            type="text"
            size="sm"
            font="mono"
            value={state.argsText}
            onChange={(e) => patch({ argsText: e.target.value })}
            placeholder="-y @scope/pkg"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
          Env
          <Textarea
            size="sm"
            font="mono"
            value={state.envText}
            onChange={(e) => patch({ envText: e.target.value })}
            placeholder="KEY=value"
            rows={2}
          />
        </label>
      </>
    ),
    http: (props) => <HttpFields {...props} />,
    sse: (props) => <HttpFields {...props} />,
  };

function HttpFields({ state, patch, labelStyle }: McpFormTransportFieldsProps): ReactNode {
  return (
    <>
      <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
        URL
        <Input
          type="text"
          size="sm"
          font="mono"
          value={state.url}
          onChange={(e) => patch({ url: e.target.value })}
          placeholder="https://host/mcp"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
        Headers
        <Textarea
          size="sm"
          font="mono"
          value={state.headersText}
          onChange={(e) => patch({ headersText: e.target.value })}
          placeholder="Authorization=Bearer token"
          rows={2}
        />
      </label>
    </>
  );
}

export function McpFormTransportFields(props: McpFormTransportFieldsProps) {
  return <>{fieldsByTransport[props.state.transport](props)}</>;
}
