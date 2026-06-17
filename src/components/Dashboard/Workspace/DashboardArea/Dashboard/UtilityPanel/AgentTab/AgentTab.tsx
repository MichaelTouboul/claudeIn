import { useMemo } from "react";

import { ContextBar } from "@/components/_ui/ContextBar";
import { StatusDot } from "@/components/_ui/StatusDot";
import { EventConsole } from "@/components/Dashboard/EventConsole/EventConsole";
import { colorMap } from "@/components/Dashboard/Workspace/utils";
import { paletteColor } from "@/hooks/useConversationAgents";
import { contextPercentForAgent } from "@/store/dashboard/sessionContext";
import { AgentPresenceStatus, useEventsStore } from "@/store/dashboard/useEventsStore";
import { type PanelTab, PanelTabKind } from "@/store/dashboard/usePanelStore";

// Value → header dot behavior, defined ONCE (CLAUDE.md: enum + behavior map, not
// a fallback chain). `active` pulses; the colored idle/waiting dot is static. The
// `?? Idle` lookup below is reserved for the genuine absent case (agent seen but
// no live status), never as the primary derivation.
const AGENT_HEADER_DOT: Record<AgentPresenceStatus, { pulse: boolean; label: string }> = {
  [AgentPresenceStatus.Active]: { pulse: true, label: "active" },
  [AgentPresenceStatus.Waiting]: { pulse: false, label: "waiting" },
  [AgentPresenceStatus.Idle]: { pulse: false, label: "idle" },
};

/**
 * Live sub-agent activity view (right panel). Header = status dot (same presence
 * enum as the AgentTabs row) + current tool + a ContextBar fed by the agent's
 * accumulated context. Body = the live event stream filtered to THIS agent and,
 * when known, THIS conversation's session. All inputs are read live from
 * `useEventsStore`, so the view keeps updating while the tab stays mounted.
 */
export function AgentTab({ tab }: { tab: PanelTab }) {
  const agentName = tab.kind === PanelTabKind.Agent ? tab.payload.agentName : "";
  const claudeSessionId = tab.kind === PanelTabKind.Agent ? tab.payload.claudeSessionId : null;

  const status = useEventsStore(
    (s) => (claudeSessionId ? s.presence.get(claudeSessionId)?.get(agentName) : undefined),
  );
  const globalTool = useEventsStore((s) => s.currentTools.get(agentName));
  const context = useEventsStore((s) => s.agentContexts.get(agentName));
  // Backend context %: this conversation's value (keyed by claudeSessionId) when
  // known, else the agent's live session(s). Never computed in the renderer.
  const percent = useEventsStore((s) =>
    (claudeSessionId ? s.sessionContexts.get(claudeSessionId) : undefined) ??
    contextPercentForAgent(s.presence, s.sessionContexts, agentName),
  );
  // Select the raw buffer (stable reference) and filter in a memo, so the
  // selector never returns a fresh array on every store read (infinite render).
  const allEvents = useEventsStore((s) => s.events);
  const events = useMemo(
    () =>
      allEvents.filter(
        (e) =>
          e.agent_name === agentName &&
          (claudeSessionId === null || e.session_id === claudeSessionId),
      ),
    [allEvents, agentName, claudeSessionId],
  );

  // The store's `currentTools` map is keyed by agent name ONLY, so it would leak
  // a same-named agent's tool from a DIFFERENT conversation. Scope to this
  // session by reading the most recent tool from the already session-filtered
  // stream (events are newest-first); fall back to the global tool only when the
  // session is unscoped (claudeSessionId === null).
  const sessionTool = events.find((e) => e.tool_name)?.tool_name ?? undefined;
  const currentTool = claudeSessionId === null ? globalTool : sessionTool;

  if (tab.kind !== PanelTabKind.Agent) return null;

  const dot = AGENT_HEADER_DOT[status ?? AgentPresenceStatus.Idle];
  const color = paletteColor(agentName);
  const dotClass = dot.pulse ? "bg-active" : colorMap[color] || "bg-surface-3";
  const colorByName = new Map<string, string>([[agentName, color]]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="relative flex items-center gap-2 border-b px-4 py-2"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface-1)",
        }}
      >
        {percent !== null && percent !== undefined && percent > 0 ? (
          <ContextBar
            percent={percent}
            tokensIn={context?.tokensIn ?? 0}
            tokensOut={context?.tokensOut ?? 0}
            costUsd={context?.costUsd ?? 0}
          />
        ) : null}
        <StatusDot
          data-testid="agent-tab-panel-dot"
          size="sm"
          pulse={dot.pulse}
          className={`relative ${dotClass}`}
        />
        <span
          className="relative truncate text-xs font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {agentName}
        </span>
        <span
          className="relative text-[10px] uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          {dot.label}
        </span>
        {currentTool ? (
          <span
            data-testid="agent-tab-panel-tool"
            className="relative ml-auto truncate font-mono text-[11px]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {currentTool}
          </span>
        ) : null}
      </div>
      <div data-testid="agent-tab-panel-stream" className="min-h-0 flex-1">
        {events.length === 0 ? (
          <p
            className="px-4 py-3 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            No activity yet for this agent.
          </p>
        ) : (
          <EventConsole events={events} agentColorMap={colorByName} />
        )}
      </div>
    </div>
  );
}
