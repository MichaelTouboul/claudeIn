/**
 * Pure parser for `claude mcp get <name>` human-readable output into a typed
 * `McpServerRaw`. Kept separate from the service so it's unit-testable without
 * the spawn seam, and so `mcp.manage.ts` stays well under the 300-line limit.
 *
 * Sample stdio output:
 *   pw:
 *     Scope: User config (available in all your projects)
 *     Type: stdio
 *     Command: npx
 *     Args: -y @playwright/mcp
 *     Environment:
 *       API_KEY=secret
 * Sample http output:
 *   gh:
 *     Scope: User config (...)
 *     Type: http
 *     URL: https://api.example/mcp
 *     Headers:
 *       Authorization: Bearer t
 */
import type { McpServerRaw } from "../../types/mcp-manage.types";

/** Maps the CLI's prose scope description to our `user | project | local`. */
function parseScope(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes("user")) return "user";
  if (lower.includes("local")) return "local";
  if (lower.includes("project")) return "project";
  return value.trim();
}

type Section = "none" | "env" | "headers";

/** Parses an indented `KEY=VALUE` (env) or `KEY: VALUE` (header) child line. */
function parseChildPair(line: string, section: Section): [string, string] | null {
  const trimmed = line.trim();
  if (section === "env") {
    const eq = trimmed.indexOf("=");
    if (eq === -1) return null;
    return [trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim()];
  }
  const colon = trimmed.indexOf(":");
  if (colon === -1) return null;
  return [trimmed.slice(0, colon).trim(), trimmed.slice(colon + 1).trim()];
}

/** A top-level field is indented (~2 spaces) and matches `Label: value`. */
function parseTopField(line: string): [string, string] | null {
  if (/^\s{4,}/.test(line)) return null; // deeper indent → child of a section
  const trimmed = line.trim();
  const colon = trimmed.indexOf(":");
  if (colon === -1) return null;
  return [trimmed.slice(0, colon).trim().toLowerCase(), trimmed.slice(colon + 1).trim()];
}

export function parseMcpGet(name: string, stdout: string): McpServerRaw {
  const raw: McpServerRaw = { name, transport: "", scope: "" };
  const env: Record<string, string> = {};
  const headers: Record<string, string> = {};
  let section: Section = "none";

  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;

    // Deeper-indented lines belong to the open Environment/Headers section.
    if (section !== "none" && /^\s{4,}/.test(line)) {
      const pair = parseChildPair(line, section);
      if (pair) (section === "env" ? env : headers)[pair[0]] = pair[1];
      continue;
    }
    section = "none";

    const field = parseTopField(line);
    if (!field) continue;
    const [label, value] = field;

    if (label === "scope") raw.scope = parseScope(value);
    else if (label === "type") raw.transport = value;
    else if (label === "command") raw.command = value;
    else if (label === "args") raw.args = value.split(/\s+/).filter(Boolean);
    else if (label === "url") raw.url = value;
    else if (label === "environment") section = "env";
    else if (label === "headers") section = "headers";
  }

  if (Object.keys(env).length > 0) raw.env = env;
  if (Object.keys(headers).length > 0) raw.headers = headers;
  return raw;
}
