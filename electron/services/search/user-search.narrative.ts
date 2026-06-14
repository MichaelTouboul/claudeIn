/** The LLM-narrated subset of the profile (identity + summary/domains/workflow). */
export interface Narrative {
  name: string | null;
  role: string | null;
  summary: string | null;
  domains: string[];
  workflow: string | null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Parse the runner's stdout into a `Narrative`. Prefers a JSON object with
 * `name` / `role` / `summary` / `domains` / `workflow`; on non-JSON or shape
 * mismatch, falls back to treating the whole output as the summary (no identity,
 * domains, or workflow).
 */
export function parseNarrative(raw: string): Narrative {
  const trimmed = raw.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      return {
        name: asStringOrNull(obj.name),
        role: asStringOrNull(obj.role),
        summary: asStringOrNull(obj.summary),
        domains: isStringArray(obj.domains) ? obj.domains : [],
        workflow: asStringOrNull(obj.workflow),
      };
    }
  } catch {
    // not JSON → narrative-only fallback below
  }
  return {
    name: null,
    role: null,
    summary: trimmed.length > 0 ? trimmed : null,
    domains: [],
    workflow: null,
  };
}

const PLUGINS_NONE = "No other-plugin data dirs were detected.";

/** Build the exploration prompt; asks the agent for a JSON narrative. */
export function buildUserPrompt(plugins: string[]): string {
  const pluginsLine =
    plugins.length > 0
      ? `Detected plugin data dirs: ${plugins.join(", ")}.`
      : PLUGINS_NONE;
  return `Explore the user-scope \`.claude\` directory at this root — its agents, skills, MCP servers, hooks, and memory/CLAUDE.md. ${pluginsLine}

Infer the user's setup and return ONLY a JSON object with these keys:
{"name": "<the user's real name, inferred from memory files / CLAUDE.md / git config / email; null if you genuinely cannot infer it>", "role": "<the user's job or role, e.g. \\"Backend engineer at Tastewise\\"; null if you genuinely cannot infer it>", "summary": "<one-paragraph narrative of the setup>", "domains": ["<tag>", ...], "workflow": "<inferred preferred workflow>"}`;
}
