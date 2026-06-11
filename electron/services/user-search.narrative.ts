/** The LLM-narrated subset of the profile (summary/domains/workflow). */
export interface Narrative {
  summary: string | null;
  domains: string[];
  workflow: string | null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/**
 * Parse the runner's stdout into a `Narrative`. Prefers a JSON object with
 * `summary` / `domains` / `workflow`; on non-JSON or shape mismatch, falls back
 * to treating the whole output as the summary (no domains/workflow).
 */
export function parseNarrative(raw: string): Narrative {
  const trimmed = raw.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      return {
        summary: typeof obj.summary === "string" ? obj.summary : null,
        domains: isStringArray(obj.domains) ? obj.domains : [],
        workflow: typeof obj.workflow === "string" ? obj.workflow : null,
      };
    }
  } catch {
    // not JSON → narrative-only fallback below
  }
  return { summary: trimmed.length > 0 ? trimmed : null, domains: [], workflow: null };
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
{"summary": "<one-paragraph narrative of the setup>", "domains": ["<tag>", ...], "workflow": "<inferred preferred workflow>"}`;
}
