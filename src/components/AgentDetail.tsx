import { useState } from "react";
import {
  Edit3,
  Trash2,
  Brain,
  FileText,
  Settings,
  Database,
  X,
  Star,
  Save,
  RefreshCw,
} from "lucide-react";
import type { AgentFile, AgentFrontmatter } from "../types/agent.types";
import { api } from "../services/api";
import MemoryManager from "./MemoryManager";
import MarkdownBody from "./MarkdownBody";
import AgentChat from "./AgentChat";
import { Terminal } from "lucide-react";

const TABS = ["overview", "chat", "prompt", "memory", "files"] as const;
type Tab = (typeof TABS)[number];

const tabIcons: Record<Tab, React.ReactNode> = {
  overview: <Settings size={14} />,
  chat: <Terminal size={14} />,
  prompt: <FileText size={14} />,
  memory: <Brain size={14} />,
  files: <Database size={14} />,
};

function Badge({ children, variant }: { children: React.ReactNode; variant: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue:   { bg: 'rgba(59,130,246,0.12)',  text: '#93c5fd', border: 'rgba(59,130,246,0.2)' },
    green:  { bg: 'rgba(34,197,94,0.12)',   text: '#86efac', border: 'rgba(34,197,94,0.2)' },
    yellow: { bg: 'rgba(234,179,8,0.12)',   text: '#fde047', border: 'rgba(234,179,8,0.2)' },
    orange: { bg: 'rgba(249,115,22,0.12)',  text: '#fdba74', border: 'rgba(249,115,22,0.2)' },
    cyan:   { bg: 'var(--color-accent-dim)', text: 'var(--color-accent)', border: 'rgba(6,182,212,0.2)' },
    purple: { bg: 'rgba(168,85,247,0.12)',  text: '#c4b5fd', border: 'rgba(168,85,247,0.2)' },
    gray:   { bg: 'var(--color-surface-3)', text: 'var(--color-text-secondary)', border: 'var(--color-border-subtle)' },
    red:    { bg: 'rgba(248,113,113,0.12)', text: '#fca5a5', border: 'rgba(248,113,113,0.2)' },
  };
  const c = colorMap[variant] || colorMap.gray;
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium"
      style={{
        fontFamily: 'var(--font-mono)',
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        letterSpacing: '0.01em',
      }}
    >
      {children}
    </span>
  );
}

const MODEL_OPTIONS = ["", "opus", "sonnet", "haiku"];
const COLOR_OPTIONS = ["", "cyan", "blue", "green", "yellow", "orange", "red", "purple", "pink"];
const MEMORY_OPTIONS = ["", "project", "user"];
const PERMISSION_OPTIONS = ["", "default", "plan", "bypassPermissions"];
const EFFORT_OPTIONS = ["", "low", "medium", "high"];
const ISOLATION_OPTIONS = ["", "worktree"];

type FieldDef = {
  key: string;
  label: string;
  type: "string" | "dropdown" | "number" | "textarea" | "boolean";
  options?: string[];
};

const FIELDS: FieldDef[] = [
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

function fieldDisplayValue(fm: AgentFrontmatter, key: string): React.ReactNode {
  const val = fm[key];
  if (val === undefined || val === null || val === "") return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;

  if (key === "model") return <Badge variant={val === "opus" ? "purple" : val === "sonnet" ? "blue" : "gray"}>{String(val)}</Badge>;
  if (key === "color") return <Badge variant={String(val)}>{String(val)}</Badge>;
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

function EditField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const base = "w-full rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1";
  const fieldStyle: React.CSSProperties = {
    background: 'var(--color-surface-2)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(6,182,212,0.25)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
  };

  if (field.type === "dropdown") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={base}
        style={fieldStyle}
      >
        {field.options!.map((opt) => (
          <option key={opt} value={opt}>{opt || "— inherit —"}</option>
        ))}
      </select>
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={value !== undefined && value !== null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className={base}
        style={fieldStyle}
        placeholder="—"
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={`${base} resize-y`}
        style={fieldStyle}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <select
        value={value ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
        className={base}
        style={fieldStyle}
      >
        <option value="false">no</option>
        <option value="true">yes</option>
      </select>
    );
  }

  const strVal = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  return (
    <input
      type="text"
      value={strVal}
      onChange={(e) => onChange(e.target.value)}
      className={base}
      style={fieldStyle}
      placeholder="—"
    />
  );
}

function FrontmatterTable({
  agent,
  editing,
  draft,
  onDraftChange,
}: {
  agent: AgentFile;
  editing: boolean;
  draft: Partial<AgentFrontmatter>;
  onDraftChange: (key: string, val: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <tbody>
          {FIELDS.map((field, idx) => (
            <tr
              key={field.key}
              style={{
                borderBottom: '1px solid var(--color-border-subtle)',
                background: idx % 2 === 1 ? 'var(--color-surface-1)' : 'transparent',
              }}
            >
              <td
                className="py-2.5 pr-4 font-medium w-40 align-top"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.02em' }}
              >
                {field.label}
              </td>
              <td className="py-2.5" style={{ color: 'var(--color-text-primary)' }}>
                {editing ? (
                  <EditField
                    field={field}
                    value={draft[field.key] !== undefined ? draft[field.key] : agent.frontmatter[field.key]}
                    onChange={(val) => onDraftChange(field.key, val)}
                  />
                ) : (
                  fieldDisplayValue(agent.frontmatter, field.key)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AgentDetail({
  agent,
  onEdit,
  onDelete,
  onRefresh,
  onAgentUpdated,
  isFavorite,
  onToggleFavorite,
}: {
  agent: AgentFile;
  onEdit: (a: AgentFile) => void;
  onDelete: (name: string) => void;
  onRefresh: () => void;
  onAgentUpdated?: (agent: AgentFile) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("chat");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<AgentFrontmatter>>({});
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleEdit = () => {
    setDraft({});
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft({});
    setEditing(false);
  };

  const handleRefreshAgent = async () => {
    setRefreshing(true);
    try {
      const updated = await api.getAgent(agent.id);
      if (updated && onAgentUpdated) onAgentUpdated(updated);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (Object.keys(draft).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft };
      for (const key of ["tools", "disallowedTools", "subAgents"]) {
        if (typeof payload[key] === "string") {
          const arr = (payload[key] as string).split(",").map((s) => s.trim()).filter(Boolean);
          payload[key] = arr.length > 0 ? arr : undefined;
        }
      }
      const updated = await api.updateAgent(agent.id, { frontmatter: payload });
      setEditing(false);
      setDraft({});
      if (onAgentUpdated) onAgentUpdated(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleDraftChange = (key: string, val: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full ${editing ? "ring-inset rounded-lg" : ""}`}
      style={editing ? { boxShadow: 'inset 0 0 0 2px rgba(6,182,212,0.2)' } : undefined}
    >
      <div
        className="border-b px-6 py-4"
        style={{
          background: editing ? 'rgba(6,182,212,0.04)' : 'var(--color-surface-1)',
          borderColor: editing ? 'rgba(6,182,212,0.2)' : 'var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: `var(--agent-color, var(--color-accent))` }}
          />
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}
          >
            {agent.id}
          </h2>
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="p-1 rounded hover:bg-gray-800 transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star size={16} className={isFavorite ? "text-yellow-400 fill-yellow-400" : "text-gray-600 hover:text-yellow-400"} />
            </button>
          )}
          <Badge variant={agent.frontmatter.model === "opus" ? "purple" : "blue"}>
            {agent.frontmatter.model || "inherit"}
          </Badge>
          {editing && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{
                color: 'var(--color-accent)',
                background: 'var(--color-accent-dim)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
                border: '1px solid rgba(6,182,212,0.15)',
              }}
            >
              EDITING
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRefreshAgent}
                disabled={refreshing}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh from disk"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Edit3 size={14} />
                Edit
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Confirm?</span>
                  <button
                    onClick={() => {
                      onDelete(agent.id);
                      setConfirmDelete(false);
                    }}
                    className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg"
                  >
                    Delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="p-1 text-gray-400 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
        </div>
        <div className="text-xs font-mono mt-1.5" style={{ color: 'var(--color-text-muted)' }}>{agent.filePath}</div>
      </div>

      <div
        className="border-b px-6 flex items-center gap-1"
        style={{
          borderColor: editing ? 'rgba(6,182,212,0.2)' : 'var(--color-border)',
          background: 'var(--color-surface-1)',
        }}
      >
        <button
          onClick={() => setTab("chat")}
          className="flex items-center gap-1.5 px-3.5 py-1.5 my-1.5 mr-2 text-sm font-medium rounded-lg transition-all duration-150"
          style={{
            background: tab === "chat" ? 'var(--color-accent)' : 'var(--color-surface-3)',
            color: tab === "chat" ? '#fff' : 'var(--color-text-secondary)',
            boxShadow: tab === "chat" ? '0 0 12px rgba(6,182,212,0.2), 0 1px 3px rgba(0,0,0,0.3)' : 'none',
            border: tab === "chat" ? 'none' : '1px solid var(--color-border-subtle)',
          }}
        >
          <Terminal size={14} />
          Chat
        </button>
        <div className="w-px h-5 mr-1" style={{ background: 'var(--color-border)' }} />
        {TABS.filter((t) => t !== "chat").map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: tab === t ? 'var(--color-accent)' : 'transparent',
              color: tab === t ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
          >
            {tabIcons[t]}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "chat" ? (
        <div className="flex-1 min-h-0 p-3">
          <AgentChat agentName={agent.id} />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview" && (
          <FrontmatterTable agent={agent} editing={editing} draft={draft} onDraftChange={handleDraftChange} />
        )}
        {tab === "prompt" && <MarkdownBody content={agent.body} />}
        {tab === "memory" && <MemoryManager agent={agent} onRefresh={onRefresh} />}
        {tab === "files" && (
          <div className="space-y-4">
            {agent.annexFiles.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No annex files</p>
            ) : (
              agent.annexFiles.map((f) => (
                <div
                  key={f.path}
                  className="rounded-lg p-4"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
                >
                  <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{f.name}</h3>
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {f.content}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
