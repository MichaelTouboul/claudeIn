import { X } from "lucide-react";

import { Dialog } from "@/components/_ui/Dialog";
import type { SessionSummary } from "@/hooks/useSessions";

import { RecentSessionRow } from "../RecentSessionRow/RecentSessionRow";

export type LoadMoreModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: SessionSummary[];
  selectedId: string | null;
  onSelect: (filePath: string) => void;
};

export function LoadMoreModal({
  open,
  onOpenChange,
  sessions,
  selectedId,
  onSelect,
}: LoadMoreModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Older sessions"
      contentClassName="w-[min(92vw,520px)]"
    >
      <div
        className="flex flex-col max-h-[80vh] rounded-xl overflow-hidden"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
          >
            Older sessions
          </h2>
          <span
            className="text-[10px]"
            style={{
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {sessions.length}
          </span>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close older sessions"
            className="ml-auto p-1 rounded transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
          {sessions.length > 0 ? (
            sessions.map((s) => (
              <RecentSessionRow
                key={s.sessionId}
                session={s}
                selected={selectedId === s.sessionId}
                onSelect={onSelect}
              />
            ))
          ) : (
            <p
              className="text-xs text-center py-8"
              style={{ color: "var(--color-text-muted)" }}
            >
              No older sessions
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
