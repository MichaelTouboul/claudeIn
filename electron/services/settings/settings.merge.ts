import type { SettingsLayer, SettingsSnapshot, SettingsSource } from '../../types/settings.types';

/**
 * Pure merge + provenance for Claude Code settings layers.
 *
 * No filesystem, no Electron imports — unit-testable in isolation.
 *
 * Semantics (mirrors Claude Code's documented behavior):
 * - Layers are iterated in the given order (low → high precedence); the caller
 *   passes `managed` last so "later wins" yields "managed wins ties".
 * - Layers with `data === null` (absent or malformed) are skipped.
 * - Arrays concatenate across layers (low first, then higher).
 * - Plain objects deep-merge recursively.
 * - Scalars override (later wins).
 * - `provenance[key]` lists the sources that contributed to the final value, in
 *   low → high order, de-duplicated: every contributing layer for arrays/deep-merged
 *   objects; only the single winning source for scalars.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Merge a higher-precedence value on top of an existing (lower) value.
 * - both arrays → concat (existing first).
 * - both plain objects → deep-merge recursively.
 * - otherwise → the incoming (higher) value overrides.
 *
 * Returns `{ value, merged }` where `merged` is true when the incoming value
 * combined with the existing one (array concat or object deep-merge), meaning the
 * lower layer still contributes to the final value; false when the incoming value
 * fully replaced the existing one (scalar / type-mismatch override).
 */
function deepMergeValue(existing: unknown, incoming: unknown): { value: unknown; merged: boolean } {
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return { value: [...existing, ...incoming], merged: true };
  }
  if (isPlainObject(existing) && isPlainObject(incoming)) {
    const result: Record<string, unknown> = { ...existing };
    for (const key of Object.keys(incoming)) {
      if (key in result) {
        result[key] = deepMergeValue(result[key], incoming[key]).value;
      } else {
        result[key] = incoming[key];
      }
    }
    return { value: result, merged: true };
  }
  return { value: incoming, merged: false };
}

export function mergeLayers(
  layers: SettingsLayer[], // ordered low → high precedence
): Pick<SettingsSnapshot, 'effective' | 'provenance'> {
  const effective: Record<string, unknown> = {};
  const provenance: Record<string, SettingsSource[]> = {};

  for (const layer of layers) {
    if (layer.data === null) continue;

    for (const key of Object.keys(layer.data)) {
      const incoming = layer.data[key];

      if (!(key in effective)) {
        effective[key] = incoming;
        provenance[key] = [layer.source];
        continue;
      }

      const { value, merged } = deepMergeValue(effective[key], incoming);
      effective[key] = value;

      if (merged) {
        // Lower layers still contribute → append this source (de-duplicated).
        if (!provenance[key].includes(layer.source)) {
          provenance[key].push(layer.source);
        }
      } else {
        // Scalar / type-mismatch override → only the winning source counts.
        provenance[key] = [layer.source];
      }
    }
  }

  return { effective, provenance };
}
