import { type CSSProperties, type FormEvent,useState } from "react";

import type {
  McpAddInput,
  McpManageScope,
  McpMutationResult,
  McpTransportInput,
} from "@/lib/types";

import {
  buildMcpAddInput,
  emptyMcpFormState,
  firstMissingField,
  type McpFormState,
  stateFromInput,
} from "./mcpFormParse";
import { McpFormTransportFields } from "./McpFormTransportFields";

export type McpFormMode = "add" | "edit";

export type McpServerFormProps = {
  mode: McpFormMode;
  onSubmit: (input: McpAddInput) => Promise<McpMutationResult>;
  initialValues?: Partial<McpAddInput>;
};

const scopes: McpManageScope[] = ["user", "project", "local"];
const transports: McpTransportInput[] = ["stdio", "http", "sse"];
const submitLabel: Record<McpFormMode, string> = { add: "Add", edit: "Save" };

const labelStyle: CSSProperties = {
  color: "var(--color-text-muted)",
  fontFamily: "var(--font-sans)",
};
const controlStyle: CSSProperties = {
  color: "var(--color-text-primary)",
  backgroundColor: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  fontFamily: "var(--font-mono)",
};

// Shared Add/Edit form. The chosen transport drives which fields render and
// which are required (via mcpFormParse → mcpFormFields), with no fallback chain.
// Surfaces both client-side validation hints and CLI errors via role="alert".
export function McpServerForm({ mode, onSubmit, initialValues }: McpServerFormProps) {
  const [state, setState] = useState<McpFormState>(() =>
    initialValues !== undefined ? stateFromInput(initialValues) : emptyMcpFormState,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patch = (next: Partial<McpFormState>) => setState((prev) => ({ ...prev, ...next }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const missing = firstMissingField(state);
    if (missing !== null) {
      setError(`${missing} is required`);
      return;
    }
    setSubmitting(true);
    const result = await onSubmit(buildMcpAddInput(state));
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
    }
  };

  return (
    <form className="flex flex-col gap-3 px-4 py-4" onSubmit={(e) => void submit(e)} noValidate>
      <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
        Name
        <input
          type="text"
          value={state.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="rounded px-2 py-1 text-xs"
          style={controlStyle}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
        Scope
        <select
          value={state.scope}
          onChange={(e) => patch({ scope: e.target.value as McpManageScope })}
          className="rounded px-2 py-1 text-xs"
          style={controlStyle}
        >
          {scopes.map((scope) => (
            <option key={scope} value={scope}>
              {scope}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs" style={labelStyle}>
        Transport
        <select
          value={state.transport}
          onChange={(e) => patch({ transport: e.target.value as McpTransportInput })}
          className="rounded px-2 py-1 text-xs"
          style={controlStyle}
        >
          {transports.map((transport) => (
            <option key={transport} value={transport}>
              {transport}
            </option>
          ))}
        </select>
      </label>
      <McpFormTransportFields
        state={state}
        patch={patch}
        labelStyle={labelStyle}
        controlStyle={controlStyle}
      />
      {error !== null ? (
        <p role="alert" className="text-xs" style={{ color: "var(--color-danger)", fontFamily: "var(--font-mono)" }}>
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg"
          style={{ color: "#fff", background: "var(--color-accent)" }}
        >
          {submitLabel[mode]}
        </button>
      </div>
    </form>
  );
}
