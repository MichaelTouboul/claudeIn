/** The reserved fenced-code language that carries a structured ask-prompt. Shared by
 *  `parseAskPrompt` (to find the fence) and `blockRegistry` (to dispatch on lang). */
export const CAM_ASK_LANG = 'cam-ask';

export type AskOption = {
  label: string;
  value: string;
  variant?: 'accept' | 'deny' | 'neutral';
};

export type AskPrompt =
  | { type: 'choice'; question: string; options: AskOption[] }
  | { type: 'text'; question: string; placeholder?: string };

/** Tailwind classes (wired to design-system CSS vars) for each option variant. Reused by
 *  the AskPrompt picker. Moved verbatim from the former quickReplies.ts. */
export const replyStyles: Record<NonNullable<AskOption['variant']>, string> = {
  accept: 'bg-active/20 text-active border-active/30 hover:bg-active/30',
  deny: 'bg-danger/20 text-danger border-danger/30 hover:bg-danger/30',
  neutral: 'bg-surface-3/50 text-fg border-border/30 hover:bg-surface-3',
};

const VARIANTS = ['accept', 'deny', 'neutral'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAskOption(value: unknown): value is AskOption {
  if (!isRecord(value)) return false;
  if (typeof value.label !== 'string' || typeof value.value !== 'string') return false;
  if (value.variant !== undefined) {
    if (typeof value.variant !== 'string') return false;
    if (!(VARIANTS as readonly string[]).includes(value.variant)) return false;
  }
  return true;
}

function isAskPrompt(value: unknown): value is AskPrompt {
  if (!isRecord(value)) return false;
  if (value.type === 'choice') {
    if (typeof value.question !== 'string' || value.question.length === 0) return false;
    if (!Array.isArray(value.options) || value.options.length === 0) return false;
    return value.options.every(isAskOption);
  }
  if (value.type === 'text') {
    if (typeof value.question !== 'string' || value.question.length === 0) return false;
    if (value.placeholder !== undefined && typeof value.placeholder !== 'string') return false;
    return true;
  }
  return false;
}

function parseBody(body: string): AskPrompt | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  return isAskPrompt(parsed) ? parsed : null;
}

/** True when `src` (a raw fenced body) parses to a valid AskPrompt. Used by blockRegistry to
 *  decide consume-vs-fallback without re-wrapping the fence. */
export function isValidAskJson(src: string): boolean {
  return parseBody(src) !== null;
}

const FENCE_RE = /```cam-ask\s*\n([\s\S]*?)\n```/g;

/** Finds the last ` ```cam-ask ` fenced block in `content`, parses + validates it, and
 *  returns the AskPrompt (or null if absent / invalid / wrong shape). Pure — no DOM, no
 *  React, no side effects. */
export function parseAskPrompt(content: string): AskPrompt | null {
  let lastBody: string | null = null;
  let match: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;
  while ((match = FENCE_RE.exec(content)) !== null) {
    lastBody = match[1];
  }
  if (lastBody === null) return null;
  return parseBody(lastBody);
}

// --- Temporary heuristic bridge (removed in Phases 4–5) -----------------------------------
// MessageRow / AgentChat still consume the old heuristic path until they are rewired to
// parseAskPrompt + AskPrompt. These keep the build green for Phases 1–3 with identical
// behavior, and are deleted when the picker wiring lands.

export const PERMISSION_PATTERNS = [
  /\b(approu|authoriz|permission|autoris|y\/n|oui.*non|yes.*no|allow|approve)\b/i,
  /\bconfirm/i,
  /\bon y va\b/i,
  /\bpeux-tu\b/i,
  /\bdo you want\b/i,
  /\bshould I\b/i,
  /\bwould you like\b/i,
  /\bvoulez-vous\b/i,
  /\bveux-tu\b/i,
];

const QUESTION_PATTERNS = [/\?\s*$/m, /\bchoix\b/i, /\bchoose\b/i, /\bwhich\b.*\?/i, /\bquel\b/i];

export function detectQuickReplies(content: string): AskOption[] | null {
  if (PERMISSION_PATTERNS.some((p) => p.test(content))) {
    return [
      { label: 'Yes', value: 'yes', variant: 'accept' },
      { label: 'Yes, always', value: 'yes, always allow this', variant: 'accept' },
      { label: 'No', value: 'no', variant: 'deny' },
    ];
  }
  if (QUESTION_PATTERNS.some((p) => p.test(content))) {
    return [
      { label: 'Yes', value: 'yes', variant: 'accept' },
      { label: 'No', value: 'no', variant: 'deny' },
    ];
  }
  return null;
}
