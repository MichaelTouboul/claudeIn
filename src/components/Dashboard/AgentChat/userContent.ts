import { parseSlashCommand, type SlashCommandMessage,stripHarnessNoise } from './slashCommand';
import { parseToonMessage, type ToonMessageInfo } from './toonMessage';

/** The render decision for a user-role turn, shared by the live chat (`MessageRow`) and the
 *  read-only transcript viewer (`SessionMessageRow`) so both treat harness noise identically.
 *  - `hidden` — nothing genuine to show (pure slash-command caveat or pure harness plumbing);
 *     the row renders `null`, leaving no empty "you" header.
 *  - `slash` — the turn is a slash-command bundle; render it via `SlashCommandMessage`.
 *  - `toon` — the turn carries a pasted-JSON/TOON attachment fence; render the (optional) prose
 *     plus a compact `ToonMessageChip` instead of the raw blob.
 *  - `text` — genuine user prose (already stripped of any appended harness blocks); render it. */
export type UserContentRender =
  | { kind: 'hidden' }
  | { kind: 'slash'; message: SlashCommandMessage }
  | { kind: 'toon'; text: string; info: ToonMessageInfo }
  | { kind: 'text'; text: string };

/** Decides how to render a user turn. The CLI hides harness-injected blocks (background-task
 *  notifications, system reminders, tool-result payloads) but keeps the real prompt that may be
 *  appended alongside them; we mirror that exactly. Pure: no DOM, no React, no side effects.
 *
 *  Order matters:
 *  1. A slash-command bundle is plumbing — defer to `parseSlashCommand` (caveat → hidden).
 *  2. Otherwise strip harness noise; if nothing but whitespace remains → hidden.
 *  3. A pasted-JSON/TOON attachment fence → collapse the blob to a chip, keep any prose.
 *  4. Otherwise render the cleaned prose. */
export function decideUserContent(content: string): UserContentRender {
  const slash = parseSlashCommand(content);
  if (slash) {
    return slash.kind === 'caveat' ? { kind: 'hidden' } : { kind: 'slash', message: slash };
  }

  const cleaned = stripHarnessNoise(content);
  if (cleaned.trim().length === 0) return { kind: 'hidden' };

  const toon = parseToonMessage(cleaned);
  if (toon) {
    // Strip every attachment fence from the prose so the raw blob never renders;
    // the chip stands in for it.
    const prose = cleaned.replace(/```(toon|json)\n[\s\S]*?\n```/g, '').trim();
    return { kind: 'toon', text: prose, info: toon };
  }

  return { kind: 'text', text: cleaned.trim() };
}
