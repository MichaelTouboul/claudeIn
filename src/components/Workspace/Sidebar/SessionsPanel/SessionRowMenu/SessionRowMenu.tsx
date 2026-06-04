import { Archive, ArchiveRestore, Eraser, Minimize2, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useState } from "react";

import { ContextMenu, type ContextMenuItem } from "@/components/_ui/ContextMenu";
import type { SessionSummary } from "@/hooks/useSessions";

import { DeletePermanentlyDialog } from "./DeletePermanentlyDialog";
import { RenameDialog } from "./RenameDialog";

export type SessionRowMenuProps = {
  session: SessionSummary;
  // True when ClaudeIn is currently driving this session (its agent is live).
  // clear/compact are in-session ops — surfaced only here, otherwise omitted.
  piloted?: boolean;
  // Called after any app-owned meta mutation so the list refetches.
  onChanged: () => void;
};

export function SessionRowMenu({ session, piloted = false, onChanged }: SessionRowMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const { sessionId } = session;

  const currentTitle = session.title ?? session.firstPrompt ?? "";

  const run = async (op: Promise<unknown>) => {
    await op;
    onChanged();
  };

  const items: ContextMenuItem[] = [
    { label: "Rename…", icon: <Pencil size={13} />, onSelect: () => setRenameOpen(true) },
    session.pinned
      ? { label: "Unpin", icon: <PinOff size={13} />, onSelect: () => void run(window.api.unpinConversation(sessionId)) }
      : { label: "Pin to top", icon: <Pin size={13} />, onSelect: () => void run(window.api.pinConversation(sessionId)) },
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
    { label: "Delete permanently…", icon: <Trash2 size={13} />, tone: "danger", onSelect: () => setConfirmOpen(true) },
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
      <DeletePermanentlyDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        session={session}
        onDeleted={onChanged}
      />
    </>
  );
}
