/** Minimum char count for a single-line JSON blob to count as "substantial".
 *  Below this, tiny inline snippets like `{"a":1}` stay as plain pasted text. */
const SUBSTANTIAL_CHAR_THRESHOLD = 200;

/** Result of probing pasted text for substantial JSON.
 *  - `value` — the parsed JSON (object or array; primitives are rejected).
 *  - `substantial` — true when the blob is worth converting to TOON (multiline
 *    OR ≥ ~200 chars). Non-substantial valid JSON is still returned so callers
 *    can distinguish "tiny valid JSON" from "not JSON at all" (the latter → null). */
export type DetectedJson = { value: unknown; substantial: boolean };

/** Probes `text` for a JSON object/array. Returns null when it is not valid JSON,
 *  or when the parsed value is a primitive (string/number/bool/null) rather than an
 *  object or array — only structured data is a TOON candidate. Pure: no side effects. */
export function detectJson(text: string): DetectedJson | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  // Cheap structural gate before the (throwing) parse: must look like an
  // object/array literal, not a bare number/string/true/false/null.
  const first = trimmed[0];
  if (first !== '{' && first !== '[') return null;

  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (value === null || typeof value !== 'object') return null;

  const multiline = trimmed.includes('\n');
  const substantial = multiline || trimmed.length >= SUBSTANTIAL_CHAR_THRESHOLD;
  return { value, substantial };
}
