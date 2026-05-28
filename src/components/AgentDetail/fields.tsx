import type { AgentFrontmatter } from '@/types/agent.types';
import { Badge, toBadgeVariant } from '@/components/_ui/Badge';

export type FieldDef = {
  key: string;
  label: string;
  type: "string" | "dropdown" | "number" | "textarea" | "boolean";
  options?: string[];
};

export const MODEL_OPTIONS = ["", "opus", "sonnet", "haiku"];
export const COLOR_OPTIONS = ["", "cyan", "blue", "green", "yellow", "orange", "red", "purple", "pink"];
export const MEMORY_OPTIONS = ["", "project", "user"];
export const PERMISSION_OPTIONS = ["", "default", "plan", "bypassPermissions"];
export const EFFORT_OPTIONS = ["", "low", "medium", "high"];
export const ISOLATION_OPTIONS = ["", "worktree"];

export const FIELDS: FieldDef[] = [
  { key: "name", label: "Name", type: "string" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "model", label: "Model", type: "dropdown", options: MODEL_OPTIONS },
  { key: "color", label: "Color", type: "dropdown", options: COLOR_OPTIONS },
  { key: "maxTurns", label: "Max Turns", type: "number" },
  { key: "memory", label: "Memory", type: "dropdown", options: MEMORY_OPTIONS },
  { key: "permissionMode", label: "Permission Mode", type: "dropdown", options: PERMISSION_OPTIONS },
  { key: "effort", label: "Effort", type: "dropdown", options: EFFORT_OPTIONS },
  { key: "isolation", label: "Isolation", type: "dropdown", options: ISOLATION_OPTIONS },
  { key: "background", label: "Background", type: "boolean" },
  { key: "tools", label: "Tools", type: "string" },
  { key: "disallowedTools", label: "Disallowed Tools", type: "string" },
  { key: "subAgents", label: "Sub-agents", type: "string" },
];

export function fieldDisplayValue(fm: AgentFrontmatter, key: string): React.ReactNode {
  const val = fm[key];
  if (val === undefined || val === null || val === "") return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;

  if (key === "model") return <Badge variant={val === "opus" ? "purple" : val === "sonnet" ? "blue" : "gray"}>{String(val)}</Badge>;
  if (key === "color") return <Badge variant={toBadgeVariant(String(val))}>{String(val)}</Badge>;
  if (key === "memory") return <Badge variant="green">{String(val)}</Badge>;
  if (key === "background") return <Badge variant={val ? "green" : "gray"}>{val ? "yes" : "no"}</Badge>;

  if (key === "tools" || key === "disallowedTools" || key === "subAgents") {
    const arr = Array.isArray(val) ? val : typeof val === "string" ? val.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (arr.length === 0) return <span style={{ color: 'var(--color-text-muted)' }}>{key === "tools" ? "all (inherited)" : "—"}</span>;
    const variant = key === "tools" ? "cyan" : key === "subAgents" ? "blue" : "red";
    return (
      <div className="flex flex-wrap gap-1">
        {arr.map((t) => <Badge key={t} variant={variant}>{t}</Badge>)}
      </div>
    );
  }

  return <span className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{String(val)}</span>;
}
