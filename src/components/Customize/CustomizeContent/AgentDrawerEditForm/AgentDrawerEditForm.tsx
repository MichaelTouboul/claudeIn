import { Input } from "@/components/_ui/Input";
import { Select } from "@/components/_ui/Select";
import { Textarea } from "@/components/_ui/Textarea";
import type { AgentFile } from "@/lib/types";

// The safe, `updateAgent`-supported fields editable from the Customize drawer.
// Kept to the subset the agent service round-trips cleanly: description, model,
// tools (comma list) and the prompt body. Other frontmatter stays read-only in
// the drawer's overview rather than risk a field updateAgent doesn't accept.
export const MODEL_OPTIONS = ["", "opus", "sonnet", "haiku"] as const;

export type AgentDraft = {
  description: string;
  model: string;
  tools: string;
  body: string;
};

/** Seed a draft from the resolved agent (arrays flattened to comma strings). */
export function draftFromAgent(agent: AgentFile): AgentDraft {
  const tools = agent.frontmatter.tools;
  return {
    description: agent.frontmatter.description ?? "",
    model: agent.frontmatter.model ?? "",
    tools: Array.isArray(tools) ? tools.join(", ") : (tools ?? ""),
    body: agent.body,
  };
}

const fieldLabel = "mb-1.5 block text-xs font-medium uppercase tracking-[0.06em]";

export function AgentDrawerEditForm({
  draft,
  onChange,
}: {
  draft: AgentDraft;
  onChange: (patch: Partial<AgentDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="agent-description" className={fieldLabel} style={{ color: "var(--color-text-muted)" }}>
          Description
        </label>
        <Textarea
          id="agent-description"
          font="mono"
          size="sm"
          rows={3}
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="resize-y leading-relaxed"
        />
      </div>

      <div>
        <label htmlFor="agent-model" className={fieldLabel} style={{ color: "var(--color-text-muted)" }}>
          Model
        </label>
        <Select
          id="agent-model"
          font="mono"
          size="sm"
          value={draft.model}
          onChange={(e) => onChange({ model: e.target.value })}
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt || "— inherit —"}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="agent-tools" className={fieldLabel} style={{ color: "var(--color-text-muted)" }}>
          Tools (comma-separated)
        </label>
        <Input
          id="agent-tools"
          font="mono"
          value={draft.tools}
          onChange={(e) => onChange({ tools: e.target.value })}
          placeholder="all (inherited)"
        />
      </div>

      <div>
        <label htmlFor="agent-body" className={fieldLabel} style={{ color: "var(--color-text-muted)" }}>
          Prompt
        </label>
        <Textarea
          id="agent-body"
          font="mono"
          size="sm"
          value={draft.body}
          onChange={(e) => onChange({ body: e.target.value })}
          className="min-h-[42vh] resize-y leading-relaxed"
        />
      </div>
    </div>
  );
}
