import type { McpAddInput, McpManageScope, McpTransportInput } from "@/lib/types";

import { mcpFormFields } from "./mcpFormFields";

/** Editable, all-string shape backing the controlled Add/Edit form. */
export type McpFormState = {
  name: string;
  scope: McpManageScope;
  transport: McpTransportInput;
  command: string;
  argsText: string; // whitespace-separated argv
  envText: string; // one KEY=VALUE per line
  url: string;
  headersText: string; // one KEY=VALUE per line
};

export const emptyMcpFormState: McpFormState = {
  name: "",
  scope: "user",
  transport: "stdio",
  command: "",
  argsText: "",
  envText: "",
  url: "",
  headersText: "",
};

/** Split a whitespace-separated argv string into discrete entries. */
export function parseArgs(text: string): string[] {
  return text
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Parse one `KEY=VALUE` per non-empty line into a record (value may contain `=`). */
export function parsePairs(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return result;
}

/** Serialize a record back to `KEY=VALUE` lines for editing. */
export function pairsToText(pairs: Record<string, string> | undefined): string {
  if (pairs === undefined) {
    return "";
  }
  return Object.entries(pairs)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

// Behavior-per-transport: assemble the transport-specific slice of the input.
const buildTransportFields: Record<McpTransportInput, (state: McpFormState) => Partial<McpAddInput>> =
  {
    stdio: (state) => {
      const args = parseArgs(state.argsText);
      const env = parsePairs(state.envText);
      return {
        command: state.command.trim(),
        ...(args.length > 0 ? { args } : {}),
        ...(Object.keys(env).length > 0 ? { env } : {}),
      };
    },
    http: (state) => {
      const headers = parsePairs(state.headersText);
      return {
        url: state.url.trim(),
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      };
    },
    sse: (state) => {
      const headers = parsePairs(state.headersText);
      return {
        url: state.url.trim(),
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      };
    },
  };

const requiredValue: Record<string, (state: McpFormState) => string> = {
  command: (state) => state.command.trim(),
  url: (state) => state.url.trim(),
};

/** The first missing required field for the chosen transport, or null when valid. */
export function firstMissingField(state: McpFormState): string | null {
  if (state.name.trim().length === 0) {
    return "name";
  }
  for (const field of mcpFormFields[state.transport].required) {
    if ((requiredValue[field]?.(state) ?? "").length === 0) {
      return field;
    }
  }
  return null;
}

/** Build the McpAddInput from form state (assumes `firstMissingField` returned null). */
export function buildMcpAddInput(state: McpFormState): McpAddInput {
  return {
    name: state.name.trim(),
    scope: state.scope,
    transport: state.transport,
    ...buildTransportFields[state.transport](state),
  };
}

/** Seed form state from existing input (Edit mode prefill). */
export function stateFromInput(input: Partial<McpAddInput>): McpFormState {
  return {
    ...emptyMcpFormState,
    name: input.name ?? "",
    scope: input.scope ?? "user",
    transport: input.transport ?? "stdio",
    command: input.command ?? "",
    argsText: (input.args ?? []).join(" "),
    envText: pairsToText(input.env),
    url: input.url ?? "",
    headersText: pairsToText(input.headers),
  };
}
