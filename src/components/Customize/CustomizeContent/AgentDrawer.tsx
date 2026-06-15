import { Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/_ui/Avatar";
import { Badge } from "@/components/_ui/Badge";
import { Button } from "@/components/_ui/Button";
import { Dialog } from "@/components/_ui/Dialog";
import { IconButton } from "@/components/_ui/IconButton";
import { MarkdownBody } from "@/components/_ui/MarkdownBody";
import type { AgentFile, AgentSummary } from "@/lib/types";

import { type AgentDraft,AgentDrawerEditForm, draftFromAgent } from "./AgentDrawerEditForm/AgentDrawerEditForm";
import { agentHue } from "./agentHue";

type LoadState = "loading" | "loaded" | "not-found";

/** The `updateAgent` payload shape (matches the back's AgentUpdatePayload). */
type UpdatePayload = { frontmatter?: Record<string, unknown>; body?: string };

/** Build the updateAgent payload from a draft, sending only changed fields. */
function buildPayload(draft: AgentDraft, agent: AgentFile): UpdatePayload {
  const frontmatter: Record<string, unknown> = {};
  const original = draftFromAgent(agent);
  if (draft.description !== original.description) frontmatter.description = draft.description;
  if (draft.model !== original.model) frontmatter.model = draft.model || undefined;
  if (draft.tools !== original.tools) {
    const arr = draft.tools.split(",").map((t) => t.trim()).filter(Boolean);
    frontmatter.tools = arr.length > 0 ? arr : undefined;
  }
  const payload: UpdatePayload = {};
  if (Object.keys(frontmatter).length > 0) payload.frontmatter = frontmatter;
  if (draft.body !== original.body) payload.body = draft.body;
  return payload;
}

// Sub-agent drawer with a read↔edit toggle. Resolves the full agent by path,
// renders its identity + description + prompt (read), and — for USER-scope
// agents only — an editor for the safe `updateAgent` fields (description, model,
// tools, prompt body). Project-scope agents stay read-only: `updateAgent`
// resolves by name against `~/.claude/agents` only, so it cannot target them.
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = summary.scope === "user";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState("loading");
    setAgent(null);
    setEditing(false);
    setDraft(null);
    setError(null);
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

  const startEdit = () => {
    if (!agent) return;
    setDraft(draftFromAgent(agent));
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setError(null);
  };

  const dirty = agent !== null && draft !== null && Object.keys(buildPayload(draft, agent)).length > 0;

  const handleSave = async () => {
    if (!agent || !draft) return;
    const payload = buildPayload(draft, agent);
    if (Object.keys(payload).length === 0) {
      cancelEdit();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await window.api.updateAgent(agent.id, payload);
      setAgent(updated);
      setEditing(false);
      setDraft(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save this agent.");
    } finally {
      setSaving(false);
    }
  };

  const description = summary.frontmatter.description;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="drawer-right"
      title={`Sub-agent ${summary.id}`}
      contentClassName="w-[560px] max-w-[94vw]"
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
          {editable && state === "loaded" && !editing ? (
            <Button intent="ghost" size="sm" onClick={startEdit} leftIcon={<Pencil size={12} />}>
              Edit
            </Button>
          ) : null}
          <IconButton aria-label="Close" onClick={() => onOpenChange(false)}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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

          {state === "loaded" && agent && editing && draft ? (
            <AgentDrawerEditForm draft={draft} onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))} />
          ) : null}

          {state === "loaded" && agent && !editing ? (
            <>
              {description ? (
                <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {description}
                </p>
              ) : null}
              {!editable ? (
                <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Project-scoped agents are read-only here — edit them from the project's agent files.
                </p>
              ) : null}
              <MarkdownBody content={agent.body} />
            </>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          ) : null}
        </div>

        {state === "loaded" && editing ? (
          <div
            className="flex items-center justify-end gap-2 border-t px-5 py-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Button intent="ghost" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button intent="primary" size="sm" onClick={handleSave} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
