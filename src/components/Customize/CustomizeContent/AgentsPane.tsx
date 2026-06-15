import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/_ui/Avatar";
import { Badge } from "@/components/_ui/Badge";
import { useAgentsMirror } from "@/hooks/useEcosystemMirrors";
import type { AgentSummary } from "@/lib/types";

import { AgentDrawer } from "./AgentDrawer";
import { agentHue } from "./agentHue";
import { PaneEmpty, PaneLoading, PaneShell } from "./PaneShell";

function AgentRow({ agent, onOpen }: { agent: AgentSummary; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border p-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border)" }}
    >
      <Avatar name={agent.id} hue={agentHue(agent.id)} />
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-sm font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {agent.id}
        </span>
        <span className="block truncate text-[13px]" style={{ color: "var(--color-text-muted)" }}>
          {agent.frontmatter.description || "No description"}
        </span>
      </span>
      <Badge variant="blue">sub-agent</Badge>
      <span
        className="flex h-[var(--control-md)] w-[var(--control-md)] items-center justify-center"
        style={{ color: "var(--color-text-muted)" }}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </span>
    </button>
  );
}

// Sub-agents section: a list of the reconciled user+project agents for the
// active scope. Clicking a row opens a read-only detail drawer.
export function AgentsPane({ repoScope }: { repoScope: string | null }) {
  const { status, agents } = useAgentsMirror(repoScope);
  const [openAgent, setOpenAgent] = useState<AgentSummary | null>(null);

  return (
    <PaneShell title="Sub-agents" description="Specialized agents Claude can delegate to.">
      {status === "loading" ? (
        <PaneLoading label="Loading sub-agents…" />
      ) : agents.length === 0 ? (
        <PaneEmpty message="No sub-agents in this scope yet." />
      ) : (
        <div className="flex flex-col gap-2">
          {agents.map((agent) => (
            <AgentRow
              key={`${agent.scope}:${agent.id}`}
              agent={agent}
              onOpen={() => setOpenAgent(agent)}
            />
          ))}
        </div>
      )}
      {openAgent !== null ? (
        <AgentDrawer
          summary={openAgent}
          open
          onOpenChange={(open) => {
            if (!open) setOpenAgent(null);
          }}
        />
      ) : null}
    </PaneShell>
  );
}
