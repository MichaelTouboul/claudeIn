import { useEffect, useRef } from "react";

import type { LiveEvent } from "@/types/events.types";

const eventColorMap: Record<string, string> = {
  PreToolUse: "#facc15",
  PostToolUse: "#4ade80",
  Stop: "#f87171",
  SubagentStart: "#06b6d4",
  SubagentStop: "#60a5fa",
  Usage: "#8892a4",
};

const agentColorValues: Record<string, string> = {
  cyan: "#06b6d4", blue: "#60a5fa", green: "#4ade80",
  yellow: "#facc15", orange: "#fb923c", red: "#f87171",
  purple: "#c084fc", pink: "#f472b6",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
}

export type EventConsoleProps = {
  events: LiveEvent[];
  agentColorMap: Map<string, string>;
};

export function EventConsole({
  events,
  agentColorMap,
}: EventConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto px-4 py-1 font-mono text-xs leading-5"
      style={{ background: 'var(--color-surface-0)' }}
    >
      {events.length === 0 ? (
        <p className="py-2" style={{ color: 'var(--color-text-muted)' }}>Waiting for events...</p>
      ) : (
        events.map((e) => {
          const agentHex = agentColorValues[agentColorMap.get(e.agent_name) || ""] || "var(--color-text-secondary)";
          const typeHex = eventColorMap[e.event_type] || "var(--color-text-muted)";
          return (
            <div
              key={e.id}
              className="flex gap-3 rounded px-1 transition-colors hover:bg-surface-1"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              <span className="shrink-0" style={{ color: 'var(--color-text-muted)' }}>{formatTime(e.created_at)}</span>
              <span className="shrink-0 w-24" style={{ color: typeHex }}>{e.event_type}</span>
              <span className="shrink-0 w-32 truncate" style={{ color: agentHex }}>{e.agent_name}</span>
              <span className="truncate" style={{ color: 'var(--color-text-muted)' }}>{e.tool_name || ""}</span>
              {e.tokens_in > 0 ? <span className="ml-auto shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  {e.tokens_in + e.tokens_out} tok · ${e.cost_usd.toFixed(4)}
                </span> : null}
            </div>
          );
        })
      )}
    </div>
  );
}
