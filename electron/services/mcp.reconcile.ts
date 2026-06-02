import type {
  McpScope,
  McpServerEntry,
  McpSource,
  McpTransport,
} from "../types/mcp-mirror.types";

/**
 * Pure reconcile + shadowing + transport derivation for the MCP mirror.
 *
 * No filesystem, no Electron imports — unit-testable in isolation (mirrors the
 * `agents.union.ts` / `skills.union.ts` split).
 *
 * Semantics:
 * - MCP servers are keyed by `name`. The same name can appear in several config
 *   sources; precedence decides which one is active and which are `shadowed`.
 * - Precedence (low → high) is the order in which sources are passed to
 *   `reconcileMcp` via `SOURCE_PRECEDENCE`. The LAST (highest) source defining a
 *   name is active (`shadowed: false`); every lower-precedence definition of the
 *   same name is KEPT in the list marked `shadowed: true` (the UI decides whether
 *   to dim it) — same shape as the agents/skills mirrors.
 * - Inputs are never mutated; fresh entry objects are returned.
 * - Stable order (locked): entries grouped by source in precedence order
 *   (low → high), and within each source sorted by `name` ascending
 *   (`localeCompare`). Keeps the broadcast diff stable regardless of read order.
 *
 * Precedence basis (recorded): Claude Code documents MCP scope precedence as
 * local > project > user > plugin (higher wins). Transposed to this mirror's four
 * static config sources, the locked low → high order is
 *   user-settings → user-global → project-mcp-json → project-settings.
 * (`user-global`/`~/.claude.json` folds the per-project "local" store under the
 * user source by the data contract; project files outrank user files, matching
 * the documented project > user ordering.)
 */

/** Locked precedence, low → high. Higher wins on a name collision. */
export const SOURCE_PRECEDENCE: readonly McpSource[] = [
  "user-settings",
  "user-global",
  "project-mcp-json",
  "project-settings",
] as const;

/** A raw per-server config block as read from a `mcpServers` map (untyped JSON). */
export type RawServerConfig = Record<string, unknown>;

/** One source's contribution: its `name → rawConfig` map plus provenance. */
export interface SourceContribution {
  source: McpSource;
  scope: McpScope;
  servers: Record<string, RawServerConfig>;
}

/**
 * Derive `{ transport, target }` from a single server's raw config shape:
 * - `{ command, ... }` → stdio (target = command)
 * - `{ url, type: 'sse' | 'http' }` → that transport (target = url)
 * - `{ url }` with no/other type → http if a url is present, else unknown
 * - otherwise → unknown (target = '')
 * Full `args`/`env`/headers are intentionally NOT surfaced.
 */
export function deriveTransport(config: RawServerConfig): {
  transport: McpTransport;
  target: string;
} {
  const command = config.command;
  if (typeof command === "string" && command.length > 0) {
    return { transport: "stdio", target: command };
  }

  const url = config.url;
  if (typeof url === "string" && url.length > 0) {
    const type = config.type;
    if (type === "sse") return { transport: "sse", target: url };
    if (type === "http") return { transport: "http", target: url };
    // A url with no explicit (or unknown) type defaults to http.
    return { transport: "http", target: url };
  }

  return { transport: "unknown", target: "" };
}

/** Build the sorted, provenance-tagged entries for one source (no shadowing yet). */
function entriesForSource(contribution: SourceContribution): McpServerEntry[] {
  const { source, scope, servers } = contribution;
  return Object.entries(servers)
    .filter(([, config]) => config !== null && typeof config === "object")
    .map(([name, config]) => {
      const { transport, target } = deriveTransport(config);
      return { name, source, scope, transport, target, shadowed: false };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reconcile contributions from all sources into one stable, shadowing-resolved
 * `McpServerEntry[]`.
 *
 * `contributions` may arrive in any order; this orders them by
 * `SOURCE_PRECEDENCE` (low → high) internally so the result is deterministic.
 * For each server name, the highest-precedence contribution is active and every
 * lower one is marked `shadowed: true`.
 */
export function reconcileMcp(contributions: SourceContribution[]): McpServerEntry[] {
  const byName = new Map<string, McpServerEntry>(); // tracks the current winner per name

  const ordered = SOURCE_PRECEDENCE.map((source) =>
    contributions.find((c) => c.source === source),
  ).filter((c): c is SourceContribution => c !== undefined);

  const result: McpServerEntry[] = [];

  for (const contribution of ordered) {
    for (const entry of entriesForSource(contribution)) {
      const prevWinner = byName.get(entry.name);
      if (prevWinner) prevWinner.shadowed = true; // a higher source supersedes it
      byName.set(entry.name, entry);
      result.push(entry);
    }
  }

  return result;
}
