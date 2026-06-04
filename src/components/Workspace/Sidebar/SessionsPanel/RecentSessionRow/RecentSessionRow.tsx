import { GitBranch, MessageSquare, Pin } from "lucide-react";

import type { SessionSummary } from "@/hooks/useSessions";
import { useConversationTitlesStore } from "@/store/useConversationTitlesStore";
import { usePinnedStore } from "@/store/usePinnedStore";

import { SessionRowMenu } from "../SessionRowMenu/SessionRowMenu";
import { shortModel } from "../utils";

export type RecentSessionRowProps = {
  session: SessionSummary;
  selected: boolean;
  onSelect: (filePath: string) => void;
  onChanged?: () => void;
};

export function RecentSessionRow({ session, selected, onSelect, onChanged }: RecentSessionRowProps) {
  const liveTitle = useConversationTitlesStore((s) => s.conversationTitles[session.sessionId]);
  const pinnedOverride = usePinnedStore((s) => s.overrides[session.sessionId]);
  const isPinned = pinnedOverride ?? session.pinned;
  const label =
    liveTitle?.userTitle ?? liveTitle?.aiTitle ?? session.title ?? session.firstPrompt ?? session.sessionId.slice(0, 8);
  const model = shortModel(session.model);

  return (
    <div className="group relative">
      {onChanged ? (
        <div className="absolute right-1.5 top-1.5 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <SessionRowMenu session={session} onChanged={onChanged} />
        </div>
      ) : null}
      <button
        onClick={() => onSelect(session.filePath)}
        aria-pressed={selected}
        className="w-full text-left px-3 py-2 rounded-lg transition-all duration-200"
        style={{
          background: selected ? "var(--color-accent-dim)" : undefined,
          border: selected ? "1px solid rgba(6,182,212,0.2)" : "1px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (!selected) e.currentTarget.style.background = "var(--color-surface-2)";
        }}
        onMouseLeave={(e) => {
          if (!selected) e.currentTarget.style.background = "transparent";
        }}
      >
        <div className="flex items-center gap-2">
          {isPinned ? <Pin size={10} style={{ color: "var(--color-accent)", flexShrink: 0 }} /> : null}
          <span
            className="text-xs font-medium truncate"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {label}
          </span>
        </div>
        <div
          className="mt-1 flex items-center gap-2.5 text-[10px]"
          style={{
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {model ? <span>{model}</span> : null}
          <span className="flex items-center gap-1">
            <MessageSquare size={9} />
            {session.messageCount}
          </span>
          {session.branch ? (
            <span className="flex items-center gap-1 truncate">
              <GitBranch size={9} />
              {session.branch}
            </span>
          ) : null}
        </div>
      </button>
    </div>
  );
}
