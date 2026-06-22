import type { AvatarHue } from '@/components/_ui/Avatar/Avatar';

// The single source of truth for the per-conversation color picker. `value` is
// null for "Default" (no color → no dot) or one of the shared `AvatarHue`
// values, which map 1:1 to the `.agent-color-<hue>` CSS classes in index.css.
// Both the Color submenu and the row dot drive off this list — no duplicated
// literal arrays.
export type ConversationColorOption = {
  label: string;
  value: AvatarHue | null;
};

export const CONVERSATION_COLOR_OPTIONS = [
  { label: 'Default', value: null },
  { label: 'Red', value: 'red' },
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Purple', value: 'purple' },
  { label: 'Orange', value: 'orange' },
  { label: 'Pink', value: 'pink' },
  { label: 'Cyan', value: 'cyan' },
] as const satisfies readonly ConversationColorOption[];

// `.agent-color-<hue>` exposes `--agent-color`; reused for the dot + swatches.
export function hueClass(hue: AvatarHue): string {
  return `agent-color-${hue}`;
}

const VALID_HUES = new Set<string>(
  CONVERSATION_COLOR_OPTIONS.map((o) => o.value).filter((v): v is AvatarHue => v !== null),
);

// `SessionSummary.color` is a free `string | null` from the DB; narrow it back
// to a known `AvatarHue` (or null) so an unrecognized value degrades to no
// color rather than rendering a broken swatch.
export function toAvatarHue(color: string | null): AvatarHue | null {
  return color !== null && VALID_HUES.has(color) ? (color as AvatarHue) : null;
}
