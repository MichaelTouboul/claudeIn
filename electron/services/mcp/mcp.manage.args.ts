/**
 * Pure builder of `claude mcp add` argv from a typed `McpAddInput`.
 *
 * Every value is emitted as a discrete argv entry (never concatenated into a
 * shell string) so server commands/args/headers can't shell-inject. Validates
 * the name and the transport-specific required fields before building.
 */
import type { McpAddInput, McpTransportInput } from "../../types/mcp-manage.types";

/** Builds the per-transport tail (everything after `--scope <scope>`). */
type TransportTailBuilder = (input: McpAddInput) => string[];

function assertField(value: string | undefined, field: string): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`MCP add: missing required field "${field}" for this transport`);
  }
  return value;
}

const buildStdioTail: TransportTailBuilder = (input) => {
  const command = assertField(input.command, "command");
  const env = Object.entries(input.env ?? {}).flatMap(([key, value]) => [
    "--env",
    `${key}=${value}`,
  ]);
  return [...env, input.name, "--", command, ...(input.args ?? [])];
};

function buildUrlTail(input: McpAddInput, transport: McpTransportInput): string[] {
  const url = assertField(input.url, "url");
  const headers = Object.entries(input.headers ?? {}).flatMap(([key, value]) => [
    "--header",
    `${key}: ${value}`,
  ]);
  return ["--transport", transport, input.name, url, ...headers];
}

/** transport → tail builder (behavior map, not a fallback chain). */
const TRANSPORT_TAIL: Record<McpTransportInput, TransportTailBuilder> = {
  stdio: buildStdioTail,
  http: (input) => buildUrlTail(input, "http"),
  sse: (input) => buildUrlTail(input, "sse"),
};

function assertName(name: string): void {
  if (name.trim() === "") {
    throw new Error("MCP add: server name must not be empty");
  }
  if (/\s/.test(name)) {
    throw new Error("MCP add: server name must not contain whitespace");
  }
}

export function buildMcpAddArgs(input: McpAddInput): string[] {
  assertName(input.name);
  const tail = TRANSPORT_TAIL[input.transport](input);
  return ["mcp", "add", "--scope", input.scope, ...tail];
}
