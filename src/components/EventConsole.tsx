import { useRef, useEffect } from "react";
import { Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { LiveEvent } from "../hooks/useIPC";

const eventColors: Record<string, string> = {
  PreToolUse: "text-yellow-400",
  PostToolUse: "text-green-400",
  Stop: "text-red-400",
  SubagentStart: "text-cyan-400",
  SubagentStop: "text-blue-400",
  unknown: "text-gray-400",
};

const agentColors: Record<string, string> = {
  cyan: "text-cyan-400",
  blue: "text-blue-400",
  green: "text-green-400",
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  red: "text-red-400",
  purple: "text-purple-400",
  pink: "text-pink-400",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
}

export default function EventConsole({
  events,
  agentColorMap,
}: {
  events: LiveEvent[];
  agentColorMap: Map<string, string>;
}) {
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length, expanded]);

  return (
    <div
      className={`border-t border-gray-800 bg-gray-950 transition-all ${
        expanded ? "h-52" : "h-9"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 bg-gray-900/50"
      >
        <Terminal size={12} />
        <span>Event Console</span>
        <span className="text-gray-600 ml-1">{events.length} events</span>
        <span className="ml-auto">
          {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </span>
      </button>

      {expanded && (
        <div
          ref={scrollRef}
          className="h-[calc(100%-36px)] overflow-y-auto px-4 py-1 font-mono text-xs leading-5"
        >
          {events.length === 0 ? (
            <p className="text-gray-600 py-2">Waiting for events...</p>
          ) : (
            events.map((e) => {
              const agentColor =
                agentColors[agentColorMap.get(e.agent_name) || ""] || "text-gray-300";
              const typeColor = eventColors[e.event_type] || eventColors.unknown;
              return (
                <div key={e.id} className="flex gap-3 hover:bg-gray-900/50 rounded px-1">
                  <span className="text-gray-600 shrink-0">{formatTime(e.created_at)}</span>
                  <span className={`${typeColor} shrink-0 w-24`}>{e.event_type}</span>
                  <span className={`${agentColor} shrink-0 w-32 truncate`}>{e.agent_name}</span>
                  <span className="text-gray-500 truncate">{e.tool_name || ""}</span>
                  {e.tokens_in > 0 && (
                    <span className="text-gray-600 ml-auto shrink-0">
                      {e.tokens_in + e.tokens_out} tok · ${e.cost_usd.toFixed(4)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
