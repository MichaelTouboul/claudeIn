import { Pin } from "lucide-react";

import { ContextBar } from "@/components/_ui/ContextBar";
import type { SessionSummary } from "@/hooks/useSessions";
import { useConversationTitlesStore } from "@/store/useConversationTitlesStore";
import type { AgentContext } from "@/types/events.types";

import { SessionRowMenu } from "../SessionRowMenu/SessionRowMenu";

export type LiveSessionRowProps = {
  session: SessionSummary;
  context: AgentContext | undefined;
  selected: boolean;
  onSelect: (filePath: string) => void;
  // True when ClaudeIn drives this session — gates clear/compact in the menu.
  piloted?: boolean;
  onChanged?: () => void;
};

export function LiveSessionRow({
  session,
  context,
  selected,
  onSelect,
  piloted = false,
  onChanged,
}: LiveSessionRowProps) {
  const liveTitle = useConversationTitlesStore((s) => s.conversationTitles[session.sessionId]);
  const label =
    liveTitle?.userTitle ?? liveTitle?.aiTitle ?? session.title ?? session.firstPrompt ?? session.sessionId.slice(0, 8);
  const showContext = context !== undefined && context.percent > 0;

  return (
    <div className="group relative">
      {onChanged ? (
        <div className="absolute right-1.5 top-1.5 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <SessionRowMenu session={session} piloted={piloted} onChanged={onChanged} />
        </div>
      ) : null}
      <button
        onClick={() => onSelect(session.filePath)}
        aria-pressed={selected}
        className="relative w-full text-left px-3 py-2 rounded-lg transition-all duration-200 overflow-hidden"
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
        {showContext ? (
          <ContextBar
            percent={context.percent}
            tokensIn={context.tokensIn}
            tokensOut={context.tokensOut}
            costUsd={context.costUsd}
          />
        ) : null}
        <div className="relative flex items-center gap-2">
          {session.pinned ? <Pin size={10} style={{ color: "var(--color-accent)", flexShrink: 0 }} /> : null}
          <span
            className="text-xs font-medium truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {label}
          </span>
        </div>
      </button>
    </div>
  );
}
