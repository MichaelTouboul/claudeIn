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
  accept: "bg-green-600/20 text-green-400 border-green-500/30 hover:bg-green-600/30",
  deny: "bg-red-600/20 text-red-400 border-red-500/30 hover:bg-red-600/30",
  neutral: "bg-gray-700/50 text-gray-300 border-gray-600/30 hover:bg-gray-700",
};
