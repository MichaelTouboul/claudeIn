import { encode } from '@toon-format/toon';

/** Encodes a parsed JSON value to TOON (Token-Oriented Object Notation) text.
 *  Pure passthrough to `@toon-format/toon`'s `encode`; kept as a named helper so
 *  the dependency is bridged in exactly one place and callers import via the utils
 *  barrel. Throws if the value is not encodable — callers MUST catch and fall back
 *  to the raw JSON (never lose user data). */
export function encodeToon(value: unknown): string {
  return encode(value);
}
