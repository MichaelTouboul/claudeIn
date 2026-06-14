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
 * Pull a JSON object substring out of arbitrary LLM prose. The model often wraps
 * the object in a markdown code fence (```json … ```) and/or prefixes it with an
 * explanatory preamble. Tries, in order: a fenced ```json / ``` block, then the
 * first balanced top-level `{ … }` (nesting- and string-aware). Returns the inner
 * JSON text, or `null` when nothing object-like is present.
 */
export function extractJsonObject(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const inner = fenced[1].trim();
    const balanced = firstBalancedObject(inner);
    if (balanced) return balanced;
  }
  return firstBalancedObject(raw);
}

/** Scan for the first `{` and return the substring up to its matching `}`. */
function firstBalancedObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function narrativeFromObject(obj: Record<string, unknown>): Narrative {
  return {
    name: asStringOrNull(obj.name),
    role: asStringOrNull(obj.role),
    summary: asStringOrNull(obj.summary),
    domains: isStringArray(obj.domains) ? obj.domains : [],
    workflow: asStringOrNull(obj.workflow),
  };
}

function tryParseObject(candidate: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(candidate);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // not parseable → caller tries the next strategy
  }
  return null;
}

/**
 * Parse the runner's stdout into a `Narrative`. The LLM may return a clean JSON
 * object, or prose wrapped around a ```json fenced (or bare) object. Tries, in
 * order: (1) strict parse of the trimmed output, (2) parse a code-fenced or first
 * balanced `{ … }` substring extracted from the text; only when none yields an
 * object does it fall back to treating the whole output as the summary (no
 * identity, domains, or workflow).
 */
export function parseNarrative(raw: string): Narrative {
  const trimmed = raw.trim();
  const direct = tryParseObject(trimmed);
  if (direct) return narrativeFromObject(direct);

  const extracted = extractJsonObject(trimmed);
  if (extracted) {
    const obj = tryParseObject(extracted);
    if (obj) return narrativeFromObject(obj);
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
{"name": "<the user's real name, inferred from memory files / CLAUDE.md / git config / email; null if you genuinely cannot infer it>", "role": "<the user's job or role, e.g. \\"Backend engineer at Tastewise\\"; null if you genuinely cannot infer it>", "summary": "<one-paragraph narrative of the setup>", "domains": ["<tag>", ...], "workflow": "<inferred preferred workflow>"}

Output ONLY the raw JSON object — no preamble, no explanation, and no markdown code fences.`;
}
