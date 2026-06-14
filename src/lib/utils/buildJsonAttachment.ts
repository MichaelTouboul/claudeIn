import { type JsonAttachment } from '@/lib/types';
import { AttachmentFormat } from '@/lib/types';

import { detectJson } from './detectJson';
import { encodeToon } from './encodeToon';
import { estimateTokens } from './estimateTokens';

/** Builds a {@link JsonAttachment} from substantial pasted JSON, or returns null
 *  when `text` is not substantial JSON (caller then lets the paste fall through as
 *  plain text). Safety contract (per spec): every failure degrades gracefully and
 *  never loses the user's data —
 *   - TOON encoding throws → `toon` stays null, send-format stays JSON.
 *   - tokenizer throws → `estimateTokens` already returns 0.
 *   - TOON not smaller (`saved ≤ 0`) → send-format stays JSON.
 *  The source JSON is re-serialized pretty-printed so the chip/panel show a tidy
 *  canonical form regardless of the user's pasted whitespace. Pure: no side effects. */
export function buildJsonAttachment(text: string, composerId: string): JsonAttachment | null {
  const detected = detectJson(text);
  if (!detected || !detected.substantial) return null;

  const sourceJson = JSON.stringify(detected.value, null, 2);
  const jsonTokens = estimateTokens(sourceJson);

  let toon: string | null;
  let toonTokens: number;
  try {
    toon = encodeToon(detected.value);
    toonTokens = estimateTokens(toon);
  } catch {
    toon = null;
    toonTokens = 0;
  }

  // Default to whichever is genuinely smaller (honest). If TOON failed or isn't
  // smaller, keep JSON — never default to a format that costs more.
  const toonWins = toon !== null && toonTokens < jsonTokens;
  const format = toonWins ? AttachmentFormat.Toon : AttachmentFormat.Json;

  return {
    id: crypto.randomUUID(),
    composerId,
    sourceJson,
    toon,
    format,
    jsonTokens,
    toonTokens,
  };
}
