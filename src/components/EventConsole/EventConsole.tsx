import { ChevronDown, ChevronUp,Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { LiveEvent } from "../../hooks/useIPC";

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
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length, expanded]);

  return (
    <div
      className="transition-all duration-200"
      style={{
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface-0)',
        height: expanded ? '13rem' : '2.25rem',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors"
        style={{
          color: 'var(--color-text-secondary)',
          background: 'var(--color-surface-1)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <Terminal size={12} style={{ color: 'var(--color-accent)' }} />
        <span>Event Console</span>
        <span className="ml-1" style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {events.length} events
        </span>
        <span className="ml-auto" style={{ color: 'var(--color-text-muted)' }}>
          {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </span>
      </button>

      {expanded ? <div
          ref={scrollRef}
          className="h-[calc(100%-36px)] overflow-y-auto px-4 py-1 font-mono text-xs leading-5"
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
                  className="flex gap-3 rounded px-1 transition-colors"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
        </div> : null}
    </div>
  );
}
