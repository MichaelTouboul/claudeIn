import { useState } from "react";

import { ContextMenu } from "@/components/_ui/ContextMenu";
import type { SessionSummary } from "@/hooks/useSessions";
import { usePinnedStore } from "@/store/dashboard/usePinnedStore";

import { RenameDialog } from "./RenameDialog";
import { buildSessionMenuItems } from "./sessionMenuItems";

export type SessionRowMenuProps = {
  session: SessionSummary;
  // True when ClaudeIn is currently driving this session (its agent is live).
  // clear/compact are in-session ops — surfaced only here, otherwise omitted.
  piloted?: boolean;
  // Called after any app-owned meta mutation so the list refetches.
  onChanged: () => void;
};

export function SessionRowMenu({ session, piloted = false, onChanged }: SessionRowMenuProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const { sessionId } = session;

  // Effective pinned state: optimistic override wins, else the DB-backed flag.
  // Lets the Pin/Unpin label flip instantly on toggle, before the refetch.
  const override = usePinnedStore((s) => s.overrides[sessionId]);
  const isPinned = override ?? session.pinned;

  const currentTitle = session.title ?? session.firstPrompt ?? "";

  const items = buildSessionMenuItems({
    sessionId,
    pinned: isPinned,
    archived: session.archived,
    piloted,
    onRename: () => setRenameOpen(true),
    onChanged,
  });

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
