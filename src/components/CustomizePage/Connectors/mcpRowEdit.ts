import type {
  McpAddInput,
  McpManageScope,
  McpServerRaw,
  McpTransportInput,
} from "@/types/mcp-manage.types";

const manageScopes: McpManageScope[] = ["user", "project", "local"];
const transportInputs: McpTransportInput[] = ["stdio", "http", "sse"];

function isManageScope(value: string): value is McpManageScope {
  return (manageScopes as string[]).includes(value);
}

function isTransportInput(value: string): value is McpTransportInput {
  return (transportInputs as string[]).includes(value);
}

// Map a parsed raw config (string scope/transport) into the form's typed
// Partial<McpAddInput>. The known list scope from the row is the authoritative
// fallback when the CLI scope string isn't an editable manage scope.
export function rawToAddInput(raw: McpServerRaw, fallbackScope: McpManageScope): Partial<McpAddInput> {
  return {
    name: raw.name,
    scope: isManageScope(raw.scope) ? raw.scope : fallbackScope,
    transport: isTransportInput(raw.transport) ? raw.transport : "stdio",
    command: raw.command,
    args: raw.args,
    env: raw.env,
    url: raw.url,
    headers: raw.headers,
  };
}
