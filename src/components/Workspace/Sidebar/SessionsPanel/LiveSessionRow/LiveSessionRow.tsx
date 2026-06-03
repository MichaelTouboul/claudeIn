import { ContextBar } from "@/components/_ui/ContextBar";
import type { SessionSummary } from "@/hooks/useSessions";
import type { AgentContext } from "@/types/events.types";

import type { LiveActivity } from "../utils";

// Pulse keyframe for the running voyant — injected once, design-system colors.
if (typeof document !== "undefined" && !document.getElementById("sessions-live-pulse")) {
  const style = document.createElement("style");
  style.id = "sessions-live-pulse";
  style.textContent = `
    @keyframes sessionsLivePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.7); }
    }
  `;
  document.head.appendChild(style);
}

export type LiveSessionRowProps = {
  session: SessionSummary;
  activity: LiveActivity;
  context: AgentContext | undefined;
  selected: boolean;
  onSelect: (filePath: string) => void;
};

function Voyant({ activity }: { activity: LiveActivity }) {
  const color = activity === "waiting" ? "var(--color-accent)" : "var(--color-active)";
  const label = activity === "waiting" ? "Waiting for input" : "Running";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="shrink-0 rounded-full"
      style={{
        width: 7,
        height: 7,
        background: color,
        boxShadow: `0 0 6px ${color}`,
        animation: activity === "running" ? "sessionsLivePulse 1.4s ease-in-out infinite" : undefined,
      }}
    />
  );
}

export function LiveSessionRow({
  session,
  activity,
  context,
  selected,
  onSelect,
}: LiveSessionRowProps) {
  const label = session.title || session.firstPrompt || session.sessionId.slice(0, 8);
  const showContext = context !== undefined && context.percent > 0;

  return (
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
        <Voyant activity={activity} />
        <span
          className="text-xs font-medium truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {label}
        </span>
      </div>
    </button>
  );
}
