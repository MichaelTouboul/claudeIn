import type { JsonAttachment } from '@/lib/types';
import { AttachmentFormat } from '@/lib/types';

/** The fence language for each send-format — total map, no fallback chain. The
 *  TOON attachment renders inside a ```toon (or ```json) fence so the model
 *  receives the compact form and the transcript can detect+collapse it later. */
const FENCE_LANG: Record<AttachmentFormat, string> = {
  [AttachmentFormat.Json]: 'json',
  [AttachmentFormat.Toon]: 'toon',
};

/** Builds the fenced body for ONE attachment in its chosen send-format. Falls
 *  back to JSON whenever TOON is unavailable (encoding failed) so user data is
 *  never lost, regardless of the stored `format`. */
export function attachmentToFence(att: JsonAttachment): string {
  const useToon = att.format === AttachmentFormat.Toon && att.toon !== null;
  const lang = useToon ? FENCE_LANG[AttachmentFormat.Toon] : FENCE_LANG[AttachmentFormat.Json];
  const body = useToon ? (att.toon ?? att.sourceJson) : att.sourceJson;
  return '```' + lang + '\n' + body + '\n```';
}

/** Appends every attachment's fenced block to the user's prose, in order. Returns
 *  `text` unchanged when there are no attachments. */
export function inlineToonAttachments(text: string, attachments: JsonAttachment[]): string {
  if (attachments.length === 0) return text;
  const fences = attachments.map(attachmentToFence).join('\n\n');
  return text ? `${text}\n\n${fences}` : fences;
}
