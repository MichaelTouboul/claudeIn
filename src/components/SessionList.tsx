import { Clock, GitBranch, Bot } from "lucide-react";
import type { SessionSummary } from "../hooks/useSessions";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function SessionList({
  sessions,
  selectedId,
  onSelect,
}: {
  sessions: SessionSummary[];
  selectedId: string | null;
  onSelect: (session: SessionSummary) => void;
}) {
  return (
    <div className="space-y-0.5">
      {sessions.map((s) => {
        const selected = selectedId === s.sessionId;
        return (
          <button
            key={s.sessionId}
            onClick={() => onSelect(s)}
            className="w-full text-left px-3 py-2 rounded-lg transition-all duration-200"
            style={{
              background: selected ? 'rgba(168,85,247,0.06)' : undefined,
              border: selected ? '1px solid rgba(168,85,247,0.15)' : '1px solid transparent',
              boxShadow: selected ? '0 0 12px rgba(168,85,247,0.04)' : undefined,
            }}
            onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
            onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="flex items-center gap-2">
              <Bot size={11} style={{ color: s.agentName ? 'rgba(6,182,212,0.5)' : 'var(--color-text-muted)' }} />
              <span
                className="text-xs font-medium truncate"
                style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
              >
                {s.agentName || "no agent"}
              </span>
              {s.model && (
                <span className="text-[9px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {s.model.split("-").pop()}
                </span>
              )}
              <span
                className="ml-auto text-[10px] flex items-center gap-1 shrink-0"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
              >
                <Clock size={9} />
                {timeAgo(s.lastActiveAt)}
              </span>
            </div>
            <div
              className="mt-0.5 text-[11px] truncate pl-5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {s.title || s.firstPrompt || s.sessionId.slice(0, 8)}
            </div>
            {s.branch && (
              <div className="flex items-center gap-1 mt-0.5 pl-5">
                <GitBranch size={9} style={{ color: 'var(--color-border)' }} />
                <span
                  className="text-[10px] truncate"
                  style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  {s.branch}
                </span>
              </div>
            )}
          </button>
        );
      })}
      {sessions.length === 0 && (
        <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No sessions found</p>
      )}
    </div>
  );
}
