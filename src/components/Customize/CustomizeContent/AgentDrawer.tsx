import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/_ui/Avatar";
import { Badge } from "@/components/_ui/Badge";
import { Dialog } from "@/components/_ui/Dialog";
import { IconButton } from "@/components/_ui/IconButton";
import { MarkdownBody } from "@/components/_ui/MarkdownBody";
import type { AgentFile, AgentSummary } from "@/lib/types";

import { agentHue } from "./agentHue";

type LoadState = "loading" | "loaded" | "not-found";

// Read-only sub-agent drawer: resolves the full agent on-demand (by path, which
// is scope-agnostic) and renders its identity, description and prompt body. A
// read view — editing lives in the Dashboard agent detail.
export function AgentDrawer({
  summary,
  open,
  onOpenChange,
}: {
  summary: AgentSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [agent, setAgent] = useState<AgentFile | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState("loading");
    setAgent(null);
    void window.api.getAgentByPath(summary.filePath).then((result) => {
      if (cancelled) return;
      if (result) {
        setAgent(result);
        setState("loaded");
      } else {
        setState("not-found");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, summary.filePath]);

  const description = summary.frontmatter.description;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="drawer-right"
      title={`Sub-agent ${summary.id}`}
      contentClassName="w-[440px] max-w-[92vw]"
    >
      <div
        className="flex h-full w-full flex-col border-l"
        style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border)" }}
      >
        <div
          className="flex items-center gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Avatar name={summary.id} hue={agentHue(summary.id)} />
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-[15px] font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {summary.id}
            </div>
            <Badge variant="blue">sub-agent</Badge>
          </div>
          <IconButton aria-label="Close" onClick={() => onOpenChange(false)}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {description ? (
            <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {description}
            </p>
          ) : null}
          {state === "loading" ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Loading agent…
            </p>
          ) : null}
          {state === "not-found" ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Agent file not found.
            </p>
          ) : null}
          {state === "loaded" && agent ? <MarkdownBody content={agent.body} /> : null}
        </div>
      </div>
    </Dialog>
  );
}
