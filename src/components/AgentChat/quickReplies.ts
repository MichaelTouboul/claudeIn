import type { QuickReply } from './types';

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

export const QUESTION_PATTERNS = [
  /\?\s*$/m,
  /\bchoix\b/i,
  /\bchoose\b/i,
  /\bwhich\b.*\?/i,
  /\bquel\b/i,
];

export function detectQuickReplies(content: string): QuickReply[] | null {
  const isPermission = PERMISSION_PATTERNS.some((p) => p.test(content));
  if (isPermission) {
    return [
      { label: "Yes", value: "yes", variant: "accept" },
      { label: "Yes, always", value: "yes, always allow this", variant: "accept" },
      { label: "No", value: "no", variant: "deny" },
    ];
  }

  const isQuestion = QUESTION_PATTERNS.some((p) => p.test(content));
  if (isQuestion) {
    return [
      { label: "Yes", value: "yes", variant: "accept" },
      { label: "No", value: "no", variant: "deny" },
    ];
  }

  return null;
}

export const replyStyles: Record<string, string> = {
  accept: "bg-active/20 text-active border-active/30 hover:bg-active/30",
  deny: "bg-danger/20 text-danger border-danger/30 hover:bg-danger/30",
  neutral: "bg-surface-3/50 text-fg border-border/30 hover:bg-surface-3",
};
