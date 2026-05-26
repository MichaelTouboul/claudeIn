import { useState } from "react";
import {
  Edit3,
  Trash2,
  Brain,
  FileText,
  GitBranch,
  Settings,
  Database,
  X,
  Star,
  Save,
  RefreshCw,
} from "lucide-react";
import type { AgentFile, AgentFrontmatter } from "../types/agent.types";
import { api } from "../services/api";
import MemoryViewer from "./MemoryViewer";
import MarkdownBody from "./MarkdownBody";
import AgentChat from "./AgentChat";
import { Terminal } from "lucide-react";

const TABS = ["overview", "chat", "prompt", "memory", "files", "graph"] as const;
type Tab = (typeof TABS)[number];

const tabIcons: Record<Tab, React.ReactNode> = {
  overview: <Settings size={14} />,
  chat: <Terminal size={14} />,
  prompt: <FileText size={14} />,
  memory: <Brain size={14} />,
  files: <Database size={14} />,
  graph: <GitBranch size={14} />,
};

function Badge({ children, variant }: { children: React.ReactNode; variant: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-300",
    green: "bg-green-500/20 text-green-300",
    yellow: "bg-yellow-500/20 text-yellow-300",
    orange: "bg-orange-500/20 text-orange-300",
    cyan: "bg-cyan-500/20 text-cyan-300",
    purple: "bg-purple-500/20 text-purple-300",
    gray: "bg-gray-700 text-gray-300",
    red: "bg-red-500/20 text-red-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[variant] || colors.gray}`}>
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
  if (val === undefined || val === null || val === "") return <span className="text-gray-500">—</span>;

  if (key === "model") return <Badge variant={val === "opus" ? "purple" : val === "sonnet" ? "blue" : "gray"}>{String(val)}</Badge>;
  if (key === "color") return <Badge variant={String(val)}>{String(val)}</Badge>;
  if (key === "memory") return <Badge variant="green">{String(val)}</Badge>;
  if (key === "background") return <Badge variant={val ? "green" : "gray"}>{val ? "yes" : "no"}</Badge>;

  if (key === "tools" || key === "disallowedTools" || key === "subAgents") {
    const arr = Array.isArray(val) ? val : typeof val === "string" ? val.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (arr.length === 0) return <span className="text-gray-500">{key === "tools" ? "all (inherited)" : "—"}</span>;
    const variant = key === "tools" ? "cyan" : key === "subAgents" ? "blue" : "red";
    return (
      <div className="flex flex-wrap gap-1">
        {arr.map((t) => <Badge key={t} variant={variant}>{t}</Badge>)}
      </div>
    );
  }

  return <span className="font-mono text-sm">{String(val)}</span>;
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
  const base = "w-full bg-gray-800 border border-cyan-500/50 rounded px-2.5 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30";

  if (field.type === "dropdown") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={base}
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
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <select
        value={value ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
        className={base}
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
          {FIELDS.map((field) => (
            <tr key={field.key} className="border-b border-gray-800">
              <td className="py-2.5 pr-4 text-gray-500 font-medium w-40 align-top">{field.label}</td>
              <td className="py-2.5 text-gray-200">
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
    <div className={`flex-1 flex flex-col h-full ${editing ? "ring-2 ring-cyan-500/30 ring-inset rounded-lg" : ""}`}>
      <div className={`border-b px-6 py-4 ${editing ? "border-cyan-500/30 bg-cyan-500/5" : "border-gray-800"}`}>
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full`}
            style={{ backgroundColor: `var(--agent-color, #06b6d4)` }}
          />
          <h2 className="text-lg font-bold text-white">{agent.id}</h2>
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
            <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">EDITING</span>
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
        <div className="text-xs text-gray-600 font-mono mt-1.5">{agent.filePath}</div>
      </div>

      <div className={`border-b px-6 flex items-center gap-1 ${editing ? "border-cyan-500/30" : "border-gray-800"}`}>
        <button
          onClick={() => setTab("chat")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 my-1.5 mr-2 text-sm font-medium rounded-lg transition-colors ${
            tab === "chat"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <Terminal size={14} />
          Chat
        </button>
        <div className="w-px h-5 bg-gray-700 mr-1" />
        {TABS.filter((t) => t !== "chat").map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
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
        {tab === "memory" && <MemoryViewer agent={agent} onRefresh={onRefresh} />}
        {tab === "files" && (
          <div className="space-y-4">
            {agent.annexFiles.length === 0 ? (
              <p className="text-gray-500 text-sm">No annex files</p>
            ) : (
              agent.annexFiles.map((f) => (
                <div key={f.path} className="bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">{f.name}</h3>
                  <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap font-mono">
                    {f.content}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}
        {tab === "graph" && (
          <p className="text-gray-500 text-sm">
            Graph view — select from the top-level Graph tab to see all agents.
          </p>
        )}
      </div>
      )}
    </div>
  );
}
