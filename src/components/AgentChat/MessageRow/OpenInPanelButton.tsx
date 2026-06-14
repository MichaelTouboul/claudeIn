import { PanelRightOpen } from 'lucide-react';
import { useState } from 'react';

import { PanelTabKind, textTabId, usePanelStore } from '@/store/dashboard/usePanelStore';

export type OpenInPanelButtonProps = {
  /** The message prose to open as a rendered-markdown Text tab. */
  text: string;
};

/**
 * Per-message footer affordance: sends the assistant prose into the right panel
 * as a Text tab (rendered markdown), isolated from the chat conversation.
 */
export function OpenInPanelButton({ text }: OpenInPanelButtonProps) {
  const openPanel = usePanelStore((s) => s.open);
  const [hovered, setHovered] = useState(false);

  const handleOpen = () =>
    openPanel({ id: textTabId({ text }), kind: PanelTabKind.Text, title: 'Text', payload: { text } });

  return (
    <button
      type="button"
      onClick={handleOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Open in panel"
      title="Open in panel"
      className="ml-5 mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
      style={{
        color: hovered ? 'var(--color-accent)' : 'var(--color-text-muted)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <PanelRightOpen size={12} />
      Open in panel
    </button>
  );
}
