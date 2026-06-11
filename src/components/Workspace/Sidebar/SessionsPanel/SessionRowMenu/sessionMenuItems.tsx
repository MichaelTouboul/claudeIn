import { Archive, ArchiveRestore, Clipboard, Eraser, Minimize2, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';

import type { ContextMenuItem } from '@/components/_ui/ContextMenu';
import { usePinnedStore } from '@/store/usePinnedStore';

// The single source of truth for a conversation/session row's context menu.
// Both the full SessionsPanel row menu and the Activity-list ConversationItem
// build their items from here, so the two surfaces never drift apart.
export type SessionMenuItemsArgs = {
  // The conversation's claudeSessionId — keys every IPC call.
  sessionId: string;
  // Effective pinned state (override-aware) — flips the Pin/Unpin label.
  pinned: boolean;
  // Persisted archived state — flips the Archive/Unarchive label.
  archived: boolean;
  // True when ClaudeIn is currently driving this session (its agent is live).
  // clear/compact are in-session ops — surfaced only here, otherwise omitted.
  piloted?: boolean;
  // Opens the rename dialog (owned by the consuming component).
  onRename: () => void;
  // Called after any app-owned meta mutation so the list refetches.
  onChanged: () => void;
};

export function buildSessionMenuItems({
  sessionId,
  pinned,
  archived,
  piloted = false,
  onRename,
  onChanged,
}: SessionMenuItemsArgs): ContextMenuItem[] {
  const run = async (op: Promise<unknown>) => {
    await op;
    onChanged();
  };

  // Reflect the toggle in the store immediately, then persist + refetch.
  const togglePin = (next: boolean) => {
    usePinnedStore.getState().setPinned(sessionId, next);
    void run(next ? window.api.pinConversation(sessionId) : window.api.unpinConversation(sessionId));
  };

  const items: ContextMenuItem[] = [
    { label: 'Rename…', icon: <Pencil size={13} />, onSelect: onRename },
    { label: 'Copy session id', icon: <Clipboard size={13} />, onSelect: () => void navigator.clipboard.writeText(sessionId) },
    pinned
      ? { label: 'Unpin', icon: <PinOff size={13} />, onSelect: () => togglePin(false) }
      : { label: 'Pin to top', icon: <Pin size={13} />, onSelect: () => togglePin(true) },
    archived
      ? { label: 'Unarchive', icon: <ArchiveRestore size={13} />, onSelect: () => void run(window.api.unarchiveConversation(sessionId)) }
      : { label: 'Archive', icon: <Archive size={13} />, onSelect: () => void run(window.api.archiveConversation(sessionId)) },
  ];

  // clear/compact are native in-session commands (reserve 1): live/piloted only.
  // Wiring them to the running session is not cleanly feasible from this surface
  // (no conversation→spawn-session mapping), so they are shown disabled/"soon"
  // for piloted rows and omitted otherwise — never faked.
  if (piloted) {
    items.push(
      { label: 'Clear (soon)', icon: <Eraser size={13} />, tone: 'default', onSelect: () => {} },
      { label: 'Compact (soon)', icon: <Minimize2 size={13} />, tone: 'default', onSelect: () => {} },
    );
  }

  items.push({ label: 'Delete', icon: <Trash2 size={13} />, tone: 'danger', onSelect: () => void run(window.api.softDeleteConversation(sessionId)) });

  return items;
}
