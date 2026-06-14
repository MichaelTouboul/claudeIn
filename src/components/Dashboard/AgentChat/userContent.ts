import { parseSlashCommand, type SlashCommandMessage,stripHarnessNoise } from './slashCommand';

/** The render decision for a user-role turn, shared by the live chat (`MessageRow`) and the
 *  read-only transcript viewer (`SessionMessageRow`) so both treat harness noise identically.
 *  - `hidden` — nothing genuine to show (pure slash-command caveat or pure harness plumbing);
 *     the row renders `null`, leaving no empty "you" header.
 *  - `slash` — the turn is a slash-command bundle; render it via `SlashCommandMessage`.
 *  - `text` — genuine user prose (already stripped of any appended harness blocks); render it. */
export type UserContentRender =
  | { kind: 'hidden' }
  | { kind: 'slash'; message: SlashCommandMessage }
  | { kind: 'text'; text: string };

/** Decides how to render a user turn. The CLI hides harness-injected blocks (background-task
 *  notifications, system reminders, tool-result payloads) but keeps the real prompt that may be
 *  appended alongside them; we mirror that exactly. Pure: no DOM, no React, no side effects.
 *
 *  Order matters:
 *  1. A slash-command bundle is plumbing — defer to `parseSlashCommand` (caveat → hidden).
 *  2. Otherwise strip harness noise; if nothing but whitespace remains → hidden.
 *  3. Otherwise render the cleaned prose. */
export function decideUserContent(content: string): UserContentRender {
  const slash = parseSlashCommand(content);
  if (slash) {
    return slash.kind === 'caveat' ? { kind: 'hidden' } : { kind: 'slash', message: slash };
  }

  const cleaned = stripHarnessNoise(content);
  if (cleaned.trim().length === 0) return { kind: 'hidden' };

  return { kind: 'text', text: cleaned.trim() };
}
