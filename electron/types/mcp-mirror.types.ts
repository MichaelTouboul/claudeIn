/**
 * MCP mirror data contract (additive, backend-only).
 *
 * Static configuration reconciliation only — what MCP servers are configured and
 * from where, NOT their live connection/auth status. Mirrors the shape of the
 * agents/skills mirrors (provenance + shadowing).
 */

export const McpSource = {
  UserSettings: "user-settings", // ~/.claude/settings.json
  UserGlobal: "user-global", // ~/.claude.json (top-level + projects[path])
  ProjectMcpJson: "project-mcp-json", // <project>/.mcp.json
  ProjectSettings: "project-settings", // <project>/.claude/settings.json
} as const;
export type McpSource = (typeof McpSource)[keyof typeof McpSource];

export type McpScope = "user" | "project";

export type McpTransport = "stdio" | "http" | "sse" | "unknown";

export interface McpServerEntry {
  name: string;
  source: McpSource;
  scope: McpScope;
  transport: McpTransport; // derived from the per-server config shape
  target: string; // command (stdio) or url (http/sse); '' when unknown
  shadowed: boolean; // a higher-precedence source defines the same name
}

export interface McpSnapshot {
  projectPath: string | null;
  servers: McpServerEntry[]; // reconciled, stable order
}
