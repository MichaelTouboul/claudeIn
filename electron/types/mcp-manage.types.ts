/**
 * MCP manage (MCP-2) contract — mutations via the `claude mcp` CLI.
 *
 * These types drive the pure arg builder (`buildMcpAddArgs`), the manage
 * service (add/remove/edit/get-raw over spawn), the IPC layer, and the form.
 * Distinct from the read-only mirror types in `mcp-mirror.types.ts`.
 */

/** Transports the user can add/edit in v1 (no WebSocket, no OAuth flow). */
export type McpTransportInput = "stdio" | "http" | "sse";

/** Write target for `claude mcp --scope`. */
export type McpManageScope = "user" | "project" | "local";

/** Input describing a server to add/edit, before it becomes CLI argv. */
export interface McpAddInput {
  name: string;
  scope: McpManageScope;
  projectPath?: string; // required for project/local scope by the CLI
  transport: McpTransportInput;
  // stdio:
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // http/sse:
  url?: string;
  headers?: Record<string, string>;
}

/** A server's full config, parsed from `claude mcp get <name>`. */
export interface McpServerRaw {
  name: string;
  transport: string;
  scope: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

/** Discriminated result so the renderer renders CLI errors instead of throwing. */
export type McpMutationResult = { ok: true } | { ok: false; error: string };
