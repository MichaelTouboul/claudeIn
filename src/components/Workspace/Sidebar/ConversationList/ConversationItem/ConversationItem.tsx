import { Pencil, Pin, PinOff } from 'lucide-react';
import { useState } from 'react';

import { ContextMenu, type ContextMenuItem } from '@/components/_ui/ContextMenu';
import { RenameDialog } from '@/components/Workspace/Sidebar/SessionsPanel/SessionRowMenu/RenameDialog';
import { useConversationTitlesStore } from '@/store/useConversationTitlesStore';
import { usePinnedStore } from '@/store/usePinnedStore';

export type ConversationStatus = 'live' | 'waiting' | 'idle';

// A normalized view of one ACTIVITY row — produced from either an open tab or a
// pinned session by ConversationList. The item itself stays presentation-only.
export type ConversationItemProps = {
  // The conversation's persisted title key (claudeSessionId). undefined for a
  // brand-new chat with no session id yet → no Pin/Rename for it.
  convId: string | undefined;
  // Base label (already the tab/session title); overlaid with the titles store.
  title: string;
  isActive: boolean;
  // Authoritative per-conversation running flag (useRunningStore, keyed by
  // claudeSessionId). When true it overrides `status` for the dot → live/pulse.
  running: boolean;
  status: ConversationStatus;
  // Effective pinned state (override-aware), used to flip the menu label.
  pinned: boolean;
  onActivate: () => void;
};

const dotColorFor = (status: ConversationStatus): string =>
  status === 'live' ? '#22c55e' : status === 'waiting' ? '#eab308' : 'var(--color-text-muted)';

export function ConversationItem({ convId, title, isActive, running, status, pinned, onActivate }: ConversationItemProps) {
  // Running wins over the agentName-derived status: a running turn is always the
  // live/pulse dot; otherwise fall back to waiting/idle.
  const dotStatus: ConversationStatus = running ? 'live' : status;
  const [renameOpen, setRenameOpen] = useState(false);

  // Overlay the shared titles store so a rename shows live regardless of source,
  // falling back to the provided title.
  const stored = useConversationTitlesStore((s) => (convId ? s.conversationTitles[convId] : undefined));
  const label = stored?.userTitle ?? stored?.aiTitle ?? title;

  // Optimistic pin toggle: reflect in the store immediately, then persist.
  const togglePin = () => {
    if (!convId) return;
    const next = !pinned;
    usePinnedStore.getState().setPinned(convId, next);
    void (next ? window.api.pinConversation(convId) : window.api.unpinConversation(convId));
  };

  const items: ContextMenuItem[] = [
    { label: 'Rename…', icon: <Pencil size={13} />, onSelect: () => setRenameOpen(true) },
    pinned
      ? { label: 'Unpin', icon: <PinOff size={13} />, onSelect: togglePin }
      : { label: 'Pin to top', icon: <Pin size={13} />, onSelect: togglePin },
  ];

  return (
    <div className="group relative">
      {convId ? (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <ContextMenu items={items} align="end" />
        </div>
      ) : null}
      <button
        onClick={onActivate}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left"
        style={{ background: isActive ? 'var(--color-surface-2)' : 'transparent' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = isActive ? 'var(--color-surface-2)' : 'transparent')}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColorFor(dotStatus), animation: dotStatus === 'live' ? 'pulse 1s ease-in-out infinite' : undefined }}
          title={dotStatus}
        />
        <span className="text-xs truncate" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
      </button>
      {convId ? (
        <RenameDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          claudeSessionId={convId}
          currentTitle={label}
          onRenamed={() => {}}
        />
      ) : null}
    </div>
  );
}
