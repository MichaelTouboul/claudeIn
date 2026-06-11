import type { ImproveRequestInput, ImproveTranscriptTurn } from '@/types/improve.types';

import type { BuildImproveRequestArgs, ChatMessage } from './types';

/**
 * Self-Improve loop — recap → `ImproveRequest` mapping (I4).
 *
 * Mapping (robust + documented):
 *   1. PREFERRED — the latest *assistant* message is parsed as a structured
 *      recap: `Title:`, `Description:`, and an `Acceptance:` block of `-`/`*`
 *      bullets. The system prompt asks the assistant to end with exactly this
 *      shape, so when scoping converged we lift it verbatim.
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

function parseRecap(text: string): ParsedRecap | null {
  const titleMatch = text.match(/^\s*title:\s*(.+)$/im);
  if (!titleMatch) return null;

  const descMatch = text.match(/^\s*description:\s*([\s\S]*?)(?=^\s*acceptance:|$(?![\s\S]))/im);
  const acceptance: string[] = [];
  const acceptanceBlock = text.match(/^\s*acceptance:\s*([\s\S]*)$/im);
  if (acceptanceBlock) {
    for (const line of acceptanceBlock[1].split('\n')) {
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) acceptance.push(bullet[1].trim());
    }
  }

  return {
    title: clampTitle(titleMatch[1]),
    description: (descMatch?.[1] ?? '').trim(),
    acceptance,
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
