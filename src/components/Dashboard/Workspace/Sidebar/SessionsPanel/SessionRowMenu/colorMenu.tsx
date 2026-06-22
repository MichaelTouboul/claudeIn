import { Palette } from 'lucide-react';

import type { AvatarHue } from '@/components/_ui/Avatar/Avatar';
import type { ContextMenuItem } from '@/components/_ui/ContextMenu';

import { CONVERSATION_COLOR_OPTIONS, hueClass } from './conversationColors';

export type ColorMenuArgs = {
  // The conversation's claudeSessionId — keys the IPC call.
  sessionId: string;
  // The conversation's current color (an AvatarHue) or null for Default.
  color: AvatarHue | null;
  // Called after the color is persisted so the list refetches.
  onChanged: () => void;
};

// A small filled dot in the given hue, reusing `.agent-color-<hue>` /
// `--agent-color`. A null hue renders a hollow ring (the "Default" / no-color
// swatch) so the option is still visually distinct.
function ColorSwatch({ hue }: { hue: AvatarHue | null }) {
  if (hue === null) {
    return (
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border"
        style={{ borderColor: 'var(--color-border-strong)' }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${hueClass(hue)}`}
      style={{ background: 'var(--agent-color)' }}
    />
  );
}

// Builds the "Color" submenu entry: Default + the 8 hues. The current color is
// marked `selected` (Default selected when color is null). Selecting an option
// persists via `setConversationColor` (null for Default) then refreshes.
export function buildColorMenuItem({ sessionId, color, onChanged }: ColorMenuArgs): ContextMenuItem {
  const submenu: ContextMenuItem[] = CONVERSATION_COLOR_OPTIONS.map((option) => ({
    label: option.label,
    icon: <ColorSwatch hue={option.value} />,
    selected: option.value === color,
    onSelect: () => {
      void (async () => {
        await window.api.setConversationColor(sessionId, option.value);
        onChanged();
      })();
    },
  }));

  return { label: 'Color', icon: <Palette size={13} />, submenu, onSelect: () => {} };
}
