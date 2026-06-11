import { useState } from 'react';

import { ContextMenu } from '@/components/_ui/ContextMenu';
import { RenameDialog } from '@/components/Workspace/Sidebar/SessionsPanel/SessionRowMenu/RenameDialog';
import { buildSessionMenuItems } from '@/components/Workspace/Sidebar/SessionsPanel/SessionRowMenu/sessionMenuItems';
import { type ConversationStatus,STATUS_DOT } from '@/store/useConversationStatusStore';
import { useConversationTitlesStore } from '@/store/useConversationTitlesStore';

// A normalized view of one ACTIVITY row — produced from either an open tab or a
// pinned session by ConversationList. The item itself stays presentation-only.
export type ConversationItemProps = {
  // The conversation's persisted title key (claudeSessionId). undefined for a
  // brand-new chat with no session id yet → no menu for it.
  convId: string | undefined;
  // Base label (already the tab/session title); overlaid with the titles store.
  title: string;
  isActive: boolean;
  // Explicit per-conversation status (useConversationStatusStore, keyed by
  // claudeSessionId). The ONLY fallback is `?? 'idle'` for an unknown/absent id;
  // every known value maps deterministically to its dot via STATUS_DOT.
  status: ConversationStatus;
  // Effective pinned state (override-aware), used to flip the menu label.
  pinned: boolean;
  onActivate: () => void;
  // Called after any app-owned meta mutation (archive/delete/pin/rename) so the
  // Activity list refetches — mirrors SessionRowMenu's onChanged.
  onChanged: () => void;
};

export function ConversationItem({ convId, title, isActive, status, pinned, onActivate, onChanged }: ConversationItemProps) {
  const dot = STATUS_DOT[status];
  const [renameOpen, setRenameOpen] = useState(false);

  // Overlay the shared titles store so a rename shows live regardless of source,
  // falling back to the provided title.
  const stored = useConversationTitlesStore((s) => (convId ? s.conversationTitles[convId] : undefined));
  const label = stored?.userTitle ?? stored?.aiTitle ?? title;

  // Active/open conversations are never archived, so the menu always offers
  // "Archive". The full item set is built by the shared session-menu builder so
  // this surface stays in lockstep with SessionRowMenu.
  const items = convId
    ? buildSessionMenuItems({
        sessionId: convId,
        pinned,
        archived: false,
        onRename: () => setRenameOpen(true),
        onChanged,
      })
    : [];

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
          style={{ backgroundColor: dot.color, animation: dot.pulse ? 'pulse 1s ease-in-out infinite' : undefined }}
          title={status}
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
          onRenamed={onChanged}
        />
      ) : null}
    </div>
  );
}
