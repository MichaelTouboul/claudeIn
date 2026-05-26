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
      {sessions.map((s) => (
        <button
          key={s.sessionId}
          onClick={() => onSelect(s)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
            selectedId === s.sessionId
              ? "bg-gray-800/90 ring-1 ring-purple-500/25 shadow-[0_0_12px_rgba(168,85,247,0.04)]"
              : "hover:bg-gray-800/40"
          }`}
        >
          <div className="flex items-center gap-2">
            <Bot size={11} className={s.agentName ? "text-cyan-400/60" : "text-gray-600"} />
            <span className="text-xs font-medium text-gray-300 truncate">
              {s.agentName || "no agent"}
            </span>
            {s.model && (
              <span className="text-[9px] text-gray-600 font-mono">{s.model.split("-").pop()}</span>
            )}
            <span className="ml-auto text-[10px] text-gray-600 flex items-center gap-1 tabular-nums shrink-0">
              <Clock size={9} />
              {timeAgo(s.lastActiveAt)}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-gray-500 truncate pl-5">
            {s.title || s.firstPrompt || s.sessionId.slice(0, 8)}
          </div>
          {s.branch && (
            <div className="flex items-center gap-1 mt-0.5 pl-5">
              <GitBranch size={9} className="text-gray-700" />
              <span className="text-[10px] text-gray-600 truncate">{s.branch}</span>
            </div>
          )}
        </button>
      ))}
      {sessions.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-6">No sessions found</p>
      )}
    </div>
  );
}
