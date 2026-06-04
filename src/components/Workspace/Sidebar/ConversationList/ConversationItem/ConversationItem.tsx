import { Pencil } from 'lucide-react';
import { useState } from 'react';

import { ContextMenu, type ContextMenuItem } from '@/components/_ui/ContextMenu';
import { RenameDialog } from '@/components/Workspace/Sidebar/SessionsPanel/SessionRowMenu/RenameDialog';
import { useConversationTitlesStore } from '@/store/useConversationTitlesStore';
import type { InternalTab } from '@/store/useWorkspaceStore';

type ConversationStatus = 'live' | 'waiting' | 'idle';

export type ConversationItemProps = {
  tab: InternalTab;
  isActive: boolean;
  status: ConversationStatus;
  onActivate: () => void;
};

const dotColorFor = (status: ConversationStatus): string =>
  status === 'live' ? '#22c55e' : status === 'waiting' ? '#eab308' : 'var(--color-text-muted)';

export function ConversationItem({ tab, isActive, status, onActivate }: ConversationItemProps) {
  const [renameOpen, setRenameOpen] = useState(false);

  // The conversation's persisted title key: session tabs carry it as sessionId,
  // live chat tabs as claudeSessionId (once known). A brand-new chat has none.
  const convId = tab.kind === 'session' ? tab.sessionId : tab.claudeSessionId;
  // Overlay the shared titles store so a rename shows live regardless of kind,
  // falling back to the tab's own title.
  const stored = useConversationTitlesStore((s) => (convId ? s.conversationTitles[convId] : undefined));
  const label = stored?.userTitle ?? stored?.aiTitle ?? tab.title;

  const items: ContextMenuItem[] = [
    { label: 'Rename…', icon: <Pencil size={13} />, onSelect: () => setRenameOpen(true) },
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
          style={{ backgroundColor: dotColorFor(status), animation: status === 'live' ? 'pulse 1s ease-in-out infinite' : undefined }}
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
          onRenamed={() => {}}
        />
      ) : null}
    </div>
  );
}
