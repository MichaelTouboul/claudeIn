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
} from "lucide-react";
import type { AgentFile } from "../types/agent.types";
import MemoryViewer from "./MemoryViewer";
import MarkdownBody from "./MarkdownBody";

const TABS = ["overview", "prompt", "memory", "files", "graph"] as const;
type Tab = (typeof TABS)[number];

const tabIcons: Record<Tab, React.ReactNode> = {
  overview: <Settings size={14} />,
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

function FrontmatterTable({ agent }: { agent: AgentFile }) {
  const fm = agent.frontmatter;
  const tools = Array.isArray(fm.tools)
    ? fm.tools
    : typeof fm.tools === "string"
      ? fm.tools.split(",").map((t) => t.trim())
      : [];
  const disallowed = Array.isArray(fm.disallowedTools)
    ? fm.disallowedTools
    : typeof fm.disallowedTools === "string"
      ? fm.disallowedTools.split(",").map((t) => t.trim())
      : [];

  const rows: [string, React.ReactNode][] = [
    ["Name", <span className="font-mono text-cyan-300">{fm.name}</span>],
    ["Model", <Badge variant={fm.model === "opus" ? "purple" : fm.model === "sonnet" ? "blue" : "gray"}>{fm.model || "inherit"}</Badge>],
    ["Color", fm.color ? <Badge variant={fm.color}>{fm.color}</Badge> : <span className="text-gray-500">—</span>],
    ["Max Turns", <span>{fm.maxTurns ?? "—"}</span>],
    ["Memory", fm.memory ? <Badge variant="green">{fm.memory}</Badge> : <span className="text-gray-500">none</span>],
    ["Permission Mode", <span>{fm.permissionMode ?? "default"}</span>],
    [
      "Tools",
      tools.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tools.map((t) => (
            <Badge key={t} variant="cyan">{t}</Badge>
          ))}
        </div>
      ) : (
        <span className="text-gray-500">all (inherited)</span>
      ),
    ],
    [
      "Disallowed",
      disallowed.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {disallowed.map((t) => (
            <Badge key={t} variant="red">{t}</Badge>
          ))}
        </div>
      ) : (
        <span className="text-gray-500">—</span>
      ),
    ],
    [
      "Sub-agents",
      agent.subAgents.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {agent.subAgents.map((s) => (
            <Badge key={s} variant="blue">{s}</Badge>
          ))}
        </div>
      ) : (
        <span className="text-gray-500">—</span>
      ),
    ],
  ];

  const extraKeys = Object.keys(fm).filter(
    (k) =>
      ![
        "name", "description", "model", "color", "tools", "disallowedTools",
        "maxTurns", "memory", "permissionMode", "skills", "mcpServers",
        "background", "effort", "isolation", "initialPrompt", "hooks",
      ].includes(k)
  );
  for (const key of extraKeys) {
    rows.push([key, <span className="font-mono text-sm">{JSON.stringify(fm[key])}</span>]);
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">{fm.description}</p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-gray-800">
              <td className="py-2 pr-4 text-gray-500 font-medium w-36 align-top">{label}</td>
              <td className="py-2 text-gray-200">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-gray-600 font-mono">{agent.filePath}</div>
    </div>
  );
}

export default function AgentDetail({
  agent,
  onEdit,
  onDelete,
  onRefresh,
  isFavorite,
  onToggleFavorite,
}: {
  agent: AgentFile;
  onEdit: (a: AgentFile) => void;
  onDelete: (name: string) => void;
  onRefresh: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full bg-agent-${agent.frontmatter.color || "cyan"}`}
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
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(agent)}
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
        </div>
      </div>

      <div className="border-b border-gray-800 px-6 flex gap-1">
        {TABS.map((t) => (
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

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview" && <FrontmatterTable agent={agent} />}
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
    </div>
  );
}
