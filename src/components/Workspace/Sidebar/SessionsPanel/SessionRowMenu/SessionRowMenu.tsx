import { Archive, ArchiveRestore, Clipboard, Eraser, Minimize2, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useState } from "react";

import { ContextMenu, type ContextMenuItem } from "@/components/_ui/ContextMenu";
import type { SessionSummary } from "@/hooks/useSessions";
import { usePinnedStore } from "@/store/usePinnedStore";

import { RenameDialog } from "./RenameDialog";

export type SessionRowMenuProps = {
  session: SessionSummary;
  // True when ClaudeIn is currently driving this session (its agent is live).
  // clear/compact are in-session ops — surfaced only here, otherwise omitted.
  piloted?: boolean;
  // The internal (live-process) session id — the randomUUID spawn.service mints
  // for a piloted session. "Copy session id" copies THIS when present; absent it
  // falls back to the row's claudeSessionId so the action is always useful.
  localSessionId?: string;
  // Called after any app-owned meta mutation so the list refetches.
  onChanged: () => void;
};

export function SessionRowMenu({ session, piloted = false, localSessionId, onChanged }: SessionRowMenuProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const { sessionId } = session;

  // Effective pinned state: optimistic override wins, else the DB-backed flag.
  // Lets the Pin/Unpin label flip instantly on toggle, before the refetch.
  const override = usePinnedStore((s) => s.overrides[sessionId]);
  const isPinned = override ?? session.pinned;

  const currentTitle = session.title ?? session.firstPrompt ?? "";

  const run = async (op: Promise<unknown>) => {
    await op;
    onChanged();
  };

  // Reflect the toggle in the store immediately, then persist + refetch.
  const togglePin = (pinned: boolean) => {
    usePinnedStore.getState().setPinned(sessionId, pinned);
    void run(pinned ? window.api.pinConversation(sessionId) : window.api.unpinConversation(sessionId));
  };

  // Copy the internal id when we have it (piloted/live rows), else the row's
  // claudeSessionId — never silently no-op.
  const copyId = localSessionId ?? sessionId;

  const items: ContextMenuItem[] = [
    { label: "Rename…", icon: <Pencil size={13} />, onSelect: () => setRenameOpen(true) },
    { label: "Copy session id", icon: <Clipboard size={13} />, onSelect: () => void navigator.clipboard.writeText(copyId) },
    isPinned
      ? { label: "Unpin", icon: <PinOff size={13} />, onSelect: () => togglePin(false) }
      : { label: "Pin to top", icon: <Pin size={13} />, onSelect: () => togglePin(true) },
    session.archived
      ? { label: "Unarchive", icon: <ArchiveRestore size={13} />, onSelect: () => void run(window.api.unarchiveConversation(sessionId)) }
      : { label: "Archive", icon: <Archive size={13} />, onSelect: () => void run(window.api.archiveConversation(sessionId)) },
  ];

  // clear/compact are native in-session commands (reserve 1): live/piloted only.
  // Wiring them to the running session is not cleanly feasible from this surface
  // (no conversation→spawn-session mapping), so they are shown disabled/"soon"
  // for piloted rows and omitted otherwise — never faked.
  if (piloted) {
    items.push(
      { label: "Clear (soon)", icon: <Eraser size={13} />, tone: "default", onSelect: () => {} },
      { label: "Compact (soon)", icon: <Minimize2 size={13} />, tone: "default", onSelect: () => {} },
    );
  }

  items.push(
    { label: "Delete", icon: <Trash2 size={13} />, tone: "danger", onSelect: () => void run(window.api.softDeleteConversation(sessionId)) },
  );

  return (
    <>
      <ContextMenu items={items} align="end" />
      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        claudeSessionId={session.sessionId}
        currentTitle={currentTitle}
        onRenamed={onChanged}
      />
    </>
  );
}
