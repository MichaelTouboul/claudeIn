import { GitBranch } from "lucide-react";
import { useState } from "react";

import { ContextMenu } from "@/components/_ui/ContextMenu";
import { StatusDot } from "@/components/_ui/StatusDot";
import { RenameDialog } from "@/components/Dashboard/Workspace/Sidebar/SessionsPanel/SessionRowMenu/RenameDialog";
import { buildSessionMenuItems } from "@/components/Dashboard/Workspace/Sidebar/SessionsPanel/SessionRowMenu/sessionMenuItems";
import type { SessionSummary } from "@/hooks/useSessions";
import { deriveSessionTitle } from "@/lib/utils";
import { type ConversationStatus, STATUS_DOT } from "@/store/dashboard/useConversationStatusStore";
import { useConversationTitlesStore } from "@/store/dashboard/useConversationTitlesStore";

import { SessionContextBar } from "../SessionContextBar/SessionContextBar";

export type SessionRowProps = {
  session: SessionSummary;
  // Pre-resolved display fields (ConversationList owns the derivation so the row
  // stays presentation-only): short relative time, effective pinned state, the
  // best-effort context fill (live value or transcript-derived; null → no bar).
  timeLabel: string;
  pinned: boolean;
  contextPercent: number | null;
  isActive: boolean;
  // Explicit per-conversation status (keyed by claudeSessionId upstream); the
  // ONLY fallback is Idle for an unknown id — STATUS_DOT maps each value to its
  // dot deterministically.
  status: ConversationStatus;
  onActivate: () => void;
  onChanged: () => void;
};

export function SessionRow({
  session,
  timeLabel,
  pinned,
  contextPercent,
  isActive,
  status,
  onActivate,
  onChanged,
}: SessionRowProps) {
  const dot = STATUS_DOT[status];
  const [renameOpen, setRenameOpen] = useState(false);

  // Overlay the shared titles store so a rename shows live, falling back to the
  // coalesced session title → first prompt → short id.
  const stored = useConversationTitlesStore((s) => s.conversationTitles[session.sessionId]);
  const label = deriveSessionTitle({
    sessionId: session.sessionId,
    title: session.title,
    firstPrompt: session.firstPrompt,
    userTitle: stored?.userTitle,
    aiTitle: stored?.aiTitle,
  });

  const items = buildSessionMenuItems({
    sessionId: session.sessionId,
    pinned,
    archived: session.archived,
    onRename: () => setRenameOpen(true),
    onChanged,
  });

  return (
    <div className="group relative">
      <div className="absolute right-1.5 top-1.5 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <ContextMenu items={items} align="end" />
      </div>
      <button
        onClick={onActivate}
        aria-pressed={isActive}
        className="w-full text-left px-2.5 py-2 rounded-md transition-colors"
        style={{ background: isActive ? "var(--color-accent-dim)" : "transparent" }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "var(--color-surface-2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isActive ? "var(--color-accent-dim)" : "transparent";
        }}
      >
        <div className="flex items-baseline gap-2">
          <StatusDot size="xs" pulse={dot.pulse} style={{ backgroundColor: dot.color }} title={status} />
          <span
            className="flex-1 min-w-0 truncate text-sm font-medium"
            style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-primary)" }}
            title={label}
          >
            {label}
          </span>
          <span
            className="shrink-0 text-[10px] tabular-nums"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
          >
            {timeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5 pl-3.5">
          {session.branch ? (
            <span
              className="inline-flex items-center gap-1 shrink-0 min-w-0 text-[11px]"
              style={{ color: "var(--color-text-muted)", maxWidth: 120 }}
              title={session.branch}
            >
              <GitBranch size={12} className="shrink-0" />
              <span className="truncate">{session.branch}</span>
            </span>
          ) : null}
          {contextPercent !== null ? (
            <span className="ml-auto shrink-0">
              <SessionContextBar percent={contextPercent} />
            </span>
          ) : null}
        </div>
      </button>
      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        claudeSessionId={session.sessionId}
        currentTitle={label}
        onRenamed={onChanged}
      />
    </div>
  );
}
