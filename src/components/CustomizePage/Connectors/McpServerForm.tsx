import { type CSSProperties, type FormEvent,useState } from "react";

import { Button } from "@/components/_ui/Button";
import { Flex } from "@/components/_ui/Flex";
import { Input } from "@/components/_ui/Input";
import { Select } from "@/components/_ui/Select";
import { Stack } from "@/components/_ui/Stack";
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
    <Stack as="form" gap={3} className="px-4 py-4" onSubmit={(e: FormEvent) => void submit(e)} noValidate>
      <Stack as="label" gap={1} className="text-xs" style={labelStyle}>
        Name
        <Input
          type="text"
          size="sm"
          font="mono"
          value={state.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </Stack>
      <Stack as="label" gap={1} className="text-xs" style={labelStyle}>
        Scope
        <Select
          size="sm"
          font="mono"
          value={state.scope}
          onChange={(e) => patch({ scope: e.target.value as McpManageScope })}
        >
          {scopes.map((scope) => (
            <option key={scope} value={scope}>
              {scope}
            </option>
          ))}
        </Select>
      </Stack>
      <Stack as="label" gap={1} className="text-xs" style={labelStyle}>
        Transport
        <Select
          size="sm"
          font="mono"
          value={state.transport}
          onChange={(e) => patch({ transport: e.target.value as McpTransportInput })}
        >
          {transports.map((transport) => (
            <option key={transport} value={transport}>
              {transport}
            </option>
          ))}
        </Select>
      </Stack>
      <McpFormTransportFields state={state} patch={patch} labelStyle={labelStyle} />
      {error !== null ? (
        <p role="alert" className="text-xs" style={{ color: "var(--color-danger)", fontFamily: "var(--font-mono)" }}>
          {error}
        </p>
      ) : null}
      <Flex justify="end">
        <Button type="submit" intent="primary" size="sm" disabled={submitting}>
          {submitLabel[mode]}
        </Button>
      </Flex>
    </Stack>
  );
}
