import { type ReactNode } from 'react';

import { Chip } from '@/components/_ui/Chip';

/**
 * Technical tokens that read as code inside chat prose and get wrapped in a
 * mono `Chip` (per the chat-thread design):
 *  - `@agent-name`           — a sub-agent mention (`@slack-assistant`)
 *  - `mcp__server__tool`     — a fully-qualified MCP tool id
 *  - `snake_case_permission` — an MCP permission name (`slack_send_message`)
 *
 * Order matters: the MCP id pattern must be tried before the bare snake_case
 * one so `mcp__…__slack_send_message` is captured whole, not split.
 */
const TOKEN_RE =
  /(@[a-z0-9]+(?:-[a-z0-9]+)+)|(mcp__[a-z0-9_]+)|([a-z][a-z0-9]*(?:_[a-z0-9]+)+)/gi;

/**
 * Splits `text` into a React fragment where every recognized technical token is
 * a `Chip` and everything else is plain text. Pure presentation — no markdown,
 * no side effects. Keys are derived from the match index + value (stable, never
 * the bare array index for the chip nodes).
 */
export function renderTextWithChips(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    const token = match[0];
    const start = match.index;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <Chip key={`chip-${start}-${token}`}>{token}</Chip>,
    );
    cursor = start + token.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
