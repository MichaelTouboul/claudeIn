import type { AskPrompt } from '../askPrompt';

/** What an authorization prompt is asking the user to approve, extracted from
 *  the model-authored question text (the `cam-ask` schema carries no structured
 *  fields, so we parse the tool id out of the prose). */
export type AuthInfo = {
  /** The fully-qualified MCP tool id, when one is present (`mcp__server__tool`). */
  toolId: string | null;
  /** The MCP server segment derived from the tool id (`slack` from
   *  `mcp__claude_ai_Slack__slack_send_message`), or null when absent. */
  server: string | null;
};

const MCP_TOOL_RE = /mcp__[A-Za-z0-9_]+__[A-Za-z0-9_]+/;

/** Derives the human-facing server label from an MCP tool id. The id shape is
 *  `mcp__<server-path>__<tool>`; the server path is often namespaced
 *  (`claude_ai_Slack`) — we take its last `_`-segment, lower-cased
 *  (`claude_ai_Slack` → `slack`). */
function serverFromToolId(toolId: string): string | null {
  const middle = toolId.slice('mcp__'.length, toolId.lastIndexOf('__'));
  if (middle.length === 0) return null;
  const parts = middle.split('_').filter((p) => p.length > 0);
  const last = parts[parts.length - 1];
  return last ? last.toLowerCase() : null;
}

/** Pulls the MCP tool id (and derived server) out of an authorization prompt.
 *  Scans the question first, then the option labels/values. Pure — no DOM. */
export function extractAuthInfo(prompt: AskPrompt): AuthInfo {
  if (prompt.type !== 'choice') return { toolId: null, server: null };
  const haystacks = [prompt.question, ...prompt.options.flatMap((o) => [o.label, o.value])];
  for (const text of haystacks) {
    const match = MCP_TOOL_RE.exec(text);
    if (match) {
      const toolId = match[0];
      return { toolId, server: serverFromToolId(toolId) };
    }
  }
  return { toolId: null, server: null };
}
