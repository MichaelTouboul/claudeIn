import { Bot, X } from "lucide-react";

import type { ConversationAgent } from "@/hooks/useConversationAgents";
import { CONVERSATION_AGENT_DOT } from "@/hooks/useConversationAgents";

export type AgentVignetteProps = {
  agent: ConversationAgent;
  // Open this agent's live activity view in the right panel.
  onOpen: () => void;
  // Cosmetically dismiss this agent's vignette.
  onDismiss: () => void;
};

// A single active-agent vignette: a pill with a hue-tinted avatar tile (live dot
// overlay when the agent is running), the agent name, and an inline remove `×`.
// Behavior mirrors the former presence tab — clicking opens the agent's panel,
// the `×` cosmetically dismisses it. The hue comes from the agent's identity
// color via the `.agent-color-*` class (sets `--agent-color`).
export function AgentVignette({ agent, onOpen, onDismiss }: AgentVignetteProps) {
  const live = CONVERSATION_AGENT_DOT[agent.status].pulse;
  return (
    <span
      className={`agent-color-${agent.color} group inline-flex items-center gap-1.5 rounded-full border py-[3px] pl-1 pr-2 text-xs transition-colors`}
      style={{
        background: "var(--color-surface-2)",
        color: "var(--color-text-secondary)",
        borderColor: "var(--color-border)",
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 cursor-pointer hover:text-fg transition-colors"
      >
        <span
          className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
          style={{
            background:
              "color-mix(in srgb, var(--agent-color) 18%, var(--color-surface-2))",
            border:
              "1px solid color-mix(in srgb, var(--agent-color) 32%, transparent)",
            color: "var(--agent-color)",
          }}
        >
          <Bot size={11} />
          {live ? (
            <span
              data-testid={`agent-vignette-dot-${agent.name}`}
              className="absolute -bottom-px -right-px h-[7px] w-[7px] rounded-full animate-pulse"
              style={{
                background: "var(--color-active)",
                border: "1.5px solid var(--color-surface-2)",
              }}
            />
          ) : null}
        </span>
        <span className="truncate max-w-[140px] font-medium">{agent.name}</span>
      </button>
      <button
        type="button"
        aria-label={`Dismiss ${agent.name}`}
        data-testid={`agent-vignette-dismiss-${agent.name}`}
        onClick={onDismiss}
        className="ml-0.5 flex cursor-pointer items-center text-[var(--color-text-muted)] hover:text-fg transition-colors"
      >
        <X size={11} />
      </button>
    </span>
  );
}
