import type { ImproveRequestInput, ImproveTranscriptTurn } from '@/types/improve.types';

import type { BuildImproveRequestArgs, ChatMessage } from './types';

/**
 * Self-Improve loop — recap → `ImproveRequest` mapping (I4).
 *
 * Mapping (robust + documented):
 *   1. PREFERRED — the latest *assistant* message is parsed as a structured
 *      recap. The scoping prompt asks the assistant to END with a fenced
 *      ```recap block (`TITLE:` / `DESCRIPTION:` / `ACCEPTANCE:` bullets), so
 *      when present we lift that verbatim. The parser is tolerant: it also
 *      accepts a bare (un-fenced) recap, **markdown-bold** labels
 *      (`**Title:**`, `**Titre** :`), the French `Titre`/`Critères` aliases,
 *      `:` or ` :`, `-`/`*`/`•` bullets, and ignores `---` rules plus any
 *      trailing prose/questions after the acceptance list.
 *   2. FALLBACK — if no parseable recap exists (user submitted early, or the
 *      assistant only asked questions), we use the FIRST user message as the
 *      title and the whole transcript as the description, with empty acceptance.
 * The full transcript is always attached so the runner sees the dialogue.
 */

const MAX_TITLE_LEN = 120;

function toTranscript(messages: ChatMessage[]): ImproveTranscriptTurn[] {
  return messages.map((m) => ({ role: m.role, text: m.text }));
}

function firstUserText(messages: ChatMessage[]): string {
  return messages.find((m) => m.role === 'user')?.text ?? '';
}

function clampTitle(raw: string): string {
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  return oneLine.length > MAX_TITLE_LEN ? `${oneLine.slice(0, MAX_TITLE_LEN - 1)}…` : oneLine;
}

/** A parsed structured recap, or null when the text isn't one. */
type ParsedRecap = { title: string; description: string; acceptance: string[] };

/** Label aliases per recap field — `Title`/`Titre`, etc. (case-insensitive). */
const LABEL_ALTERNATIVES = {
  title: '(?:title|titre)',
  description: '(?:description)',
  acceptance: '(?:acceptance|crit[eè]res)',
} as const;

/** Strip leading markdown bold/heading markers and a trailing `**` from a label-bearing line. */
function stripLineMarkup(line: string): string {
  return line.replace(/\*\*/g, '').replace(/^\s*#+\s*/, '');
}

/**
 * Extract the fenced ```recap block body when present, else return the whole
 * text. A bare recap (no fence) is still parsed by the field matchers below.
 */
function recapScope(text: string): string {
  const fenced = text.match(/```recap\s*\n([\s\S]*?)```/i);
  return fenced ? fenced[1] : text;
}

/** Match a single-line field (`Title: …` / `**Titre** : …`), markup-tolerant. */
function matchField(scope: string, alt: string): string | null {
  const re = new RegExp(`^\\s*(?:\\*\\*)?\\s*${alt}\\s*(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?\\s*(.+)$`, 'im');
  const m = scope.match(re);
  return m ? m[1].replace(/\*\*/g, '').trim() : null;
}

/** Match a multi-line field's body up to the next known label or end of scope. */
function matchBlock(scope: string, alt: string): string | null {
  const stop = `(?:\\*\\*)?\\s*(?:${LABEL_ALTERNATIVES.acceptance}|${LABEL_ALTERNATIVES.title})\\s*(?:\\*\\*)?\\s*:`;
  const re = new RegExp(
    `^\\s*(?:\\*\\*)?\\s*${alt}\\s*(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?\\s*([\\s\\S]*?)(?=^\\s*${stop}|$(?![\\s\\S]))`,
    'im',
  );
  const m = scope.match(re);
  if (!m) return null;
  return m[1]
    .split('\n')
    .map((l) => stripLineMarkup(l))
    .join('\n')
    .replace(/^[\s-]*$/gm, '')
    .trim();
}

/**
 * Collect bullets after the `Acceptance:` label, ignoring `---` rules and
 * stopping at trailing prose (a non-bullet, non-blank line ends the list).
 */
function parseAcceptance(scope: string): string[] {
  const re = new RegExp(
    `^\\s*(?:\\*\\*)?\\s*${LABEL_ALTERNATIVES.acceptance}\\s*(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?\\s*$([\\s\\S]*)`,
    'im',
  );
  const block = scope.match(re);
  if (!block) return [];
  const acceptance: string[] = [];
  for (const raw of block[1].split('\n')) {
    const line = raw.trim();
    if (line === '' || /^-{3,}$/.test(line)) continue;
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      acceptance.push(bullet[1].replace(/\*\*/g, '').trim());
      continue;
    }
    break; // first non-bullet, non-rule line is trailing prose → stop
  }
  return acceptance;
}

function parseRecap(text: string): ParsedRecap | null {
  const scope = recapScope(text);
  const title = matchField(scope, LABEL_ALTERNATIVES.title);
  if (!title) return null;

  return {
    title: clampTitle(title),
    description: matchBlock(scope, LABEL_ALTERNATIVES.description) ?? '',
    acceptance: parseAcceptance(scope),
  };
}

function deriveContent(messages: ChatMessage[]): ParsedRecap {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const parsed = lastAssistant ? parseRecap(lastAssistant.text) : null;
  if (parsed && parsed.title) return parsed;

  const first = firstUserText(messages);
  const description = messages.map((m) => `${m.role}: ${m.text}`).join('\n\n');
  return {
    title: clampTitle(first || 'Untitled improvement'),
    description: description || first,
    acceptance: [],
  };
}

/** Assemble the `ImproveRequestInput` to hand to `improve:submit`. */
export function buildImproveRequest({
  type,
  target,
  messages,
}: BuildImproveRequestArgs): ImproveRequestInput {
  const { title, description, acceptance } = deriveContent(messages);
  const input: ImproveRequestInput = {
    type,
    title,
    description,
    acceptance,
    transcript: toTranscript(messages),
  };
  if (target?.component) input.component = target.component;
  if (target?.sourcePath) input.sourcePath = target.sourcePath;
  return input;
}
