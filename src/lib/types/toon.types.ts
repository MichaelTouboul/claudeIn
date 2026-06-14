/** Which rendering of a JSON attachment gets inlined into the outgoing prompt.
 *  `as const` enum (used by the store, the chip, the panel tab, and the send path —
 *  3+ files) so behavior maps key off it instead of a fallback chain. */
export const AttachmentFormat = { Json: 'json', Toon: 'toon' } as const;
export type AttachmentFormat = (typeof AttachmentFormat)[keyof typeof AttachmentFormat];

/** A pasted-JSON attachment held in the composer until the message is sent.
 *  Carries both renderings (source JSON + encoded TOON) and their `≈` token counts
 *  so the chip and panel can show the delta and toggle the send-format without
 *  recomputing. `toon` is null when TOON encoding failed (we keep the JSON so the
 *  user never loses data) — in that case `format` stays `Json`. */
export interface JsonAttachment {
  id: string;
  /** The composer (chat tab id) this attachment belongs to — scopes byComposer. */
  composerId: string;
  /** The original pretty-printed JSON the user pasted. */
  sourceJson: string;
  /** The TOON encoding of the same data, or null when encoding failed. */
  toon: string | null;
  /** The format that will be inlined on send. Defaults to whichever is smaller. */
  format: AttachmentFormat;
  /** ≈ token count of `sourceJson`. */
  jsonTokens: number;
  /** ≈ token count of `toon` (0 when `toon` is null). */
  toonTokens: number;
}
