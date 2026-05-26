import { useState } from "react";
import {
  Save, Trash2, X, FileText, Plus, AlertTriangle,
  Clock, ChevronDown, ChevronRight,
} from "lucide-react";
import type { AgentFile, MemoryFile } from "../types/agent.types";
import { api } from "../services/api";

const MAX_LINES = 200;
const MAX_BYTES = 25 * 1024;

function SizeGauge({ label, current, max, unit }: { label: string; current: number; max: number; unit: string }) {
  const percent = Math.min((current / max) * 100, 100);
  const barColor =
    percent >= 90 ? "bg-red-500" :
    percent >= 70 ? "bg-yellow-500" :
    "bg-cyan-500";
  const textColor =
    percent >= 90 ? "text-red-400" :
    percent >= 70 ? "text-yellow-400" :
    "text-gray-400";

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-gray-500 w-10 font-medium">{label}</span>
      <div className="flex-1 h-[5px] bg-gray-800/80 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono tabular-nums ${textColor}`}>
        {current}/{max} {unit}
      </span>
    </div>
  );
}

function daysAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function MemoryFileCard({
  file,
  agentName,
  isIndex,
  onRefresh,
}: {
  file: MemoryFile;
  agentName: string;
  isIndex: boolean;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(file.content);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(isIndex);

  const lines = file.content.split("\n").length;
  const bytes = new TextEncoder().encode(file.content).length;

  const save = async () => {
    setSaving(true);
    try {
      await api.updateMemoryFile(agentName, file.name, content);
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${file.name}?`)) return;
    await api.deleteMemoryFile(agentName, file.name);
    onRefresh();
  };

  return (
    <div className={`rounded-lg border transition-colors ${
      isIndex
        ? "border-cyan-500/20 bg-cyan-500/[0.03]"
        : "border-gray-800/60 bg-gray-800/20 hover:border-gray-700/60"
    }`}>
      <div
        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <ChevronDown size={12} className="text-gray-600 shrink-0" />
          : <ChevronRight size={12} className="text-gray-600 shrink-0" />
        }
        <FileText size={13} className={isIndex ? "text-cyan-400/80" : "text-green-400/70"} />
        <span className={`text-sm font-medium ${isIndex ? "text-cyan-300" : "text-gray-300"}`}>
          {file.name}
        </span>
        {isIndex && (
          <span className="text-[9px] font-semibold bg-cyan-500/15 text-cyan-400/90 px-1.5 py-0.5 rounded uppercase tracking-wider">
            index
          </span>
        )}
        <span className="ml-auto flex items-center gap-2.5">
          <span className="text-[10px] text-gray-600 flex items-center gap-1">
            <Clock size={9} />
            {daysAgo(file.lastModified)}
          </span>
          <span className="text-[10px] text-gray-600 tabular-nums">{lines}L</span>
        </span>
      </div>

      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-800/30">
          {isIndex && (
            <div className="space-y-1.5 mt-3 mb-3">
              <SizeGauge label="Lines" current={lines} max={MAX_LINES} unit="lines" />
              <SizeGauge label="Size" current={bytes} max={MAX_BYTES} unit="B" />
              {lines > MAX_LINES * 0.8 && (
                <div className="flex items-center gap-1.5 text-[10px] text-yellow-400/90 mt-1">
                  <AlertTriangle size={10} />
                  Approaching limit — content past line {MAX_LINES} is truncated at session start
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 my-2">
            {editing ? (
              <>
                <button onClick={save} disabled={saving} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors">
                  <Save size={11} />{saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setContent(file.content); setEditing(false); }} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
                  <X size={11} />Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">edit</button>
                {!isIndex && (
                  <button onClick={remove} className="text-xs text-gray-600 hover:text-red-400 flex items-center gap-1 transition-colors">
                    <Trash2 size={10} />
                  </button>
                )}
              </>
            )}
          </div>

          {editing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-56 bg-gray-900/80 text-gray-300 text-xs font-mono p-3 rounded-lg border border-gray-700/60 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-y leading-relaxed"
            />
          ) : (
            <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono max-h-56 overflow-y-auto bg-gray-900/40 rounded-lg p-3 leading-relaxed">
              {file.content || "(empty)"}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function MemoryManager({
  agent,
  onRefresh,
}: {
  agent: AgentFile;
  onRefresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  if (!agent.frontmatter.memory) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500 text-sm mb-2">No persistent memory configured.</p>
        <p className="text-xs text-gray-600 leading-relaxed">
          Add <code className="text-cyan-400/80 bg-cyan-500/8 px-1.5 py-0.5 rounded font-mono">memory: project</code> or{" "}
          <code className="text-cyan-400/80 bg-cyan-500/8 px-1.5 py-0.5 rounded font-mono">memory: user</code> to frontmatter to enable.
        </p>
      </div>
    );
  }

  const indexFile = agent.memoryFiles.find((f) => f.name === "MEMORY.md");
  const topicFiles = agent.memoryFiles
    .filter((f) => f.name !== "MEMORY.md")
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

  const handleCreate = async () => {
    if (!newFileName.trim()) return;
    const name = newFileName.endsWith(".md") ? newFileName : `${newFileName}.md`;
    setSaving(true);
    try {
      await api.updateMemoryFile(agent.id, name, newContent);
      setCreating(false);
      setNewFileName("");
      setNewContent("");
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Scope:</span>
          <span className="px-2 py-0.5 bg-green-500/15 text-green-300 rounded-full text-xs font-medium">
            {agent.frontmatter.memory}
          </span>
          <span className="text-gray-600 text-xs font-mono tabular-nums">
            {agent.memoryFiles.length} files
          </span>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
        >
          <Plus size={12} />
          New topic
        </button>
      </div>

      {creating && (
        <div className="border border-cyan-500/25 rounded-lg p-4 bg-cyan-500/[0.03]">
          <div className="flex items-center gap-2 mb-2">
            <input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="topic-name.md"
              className="flex-1 bg-gray-900/80 border border-gray-700/60 text-gray-200 text-sm rounded px-3 py-1.5 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={saving || !newFileName.trim()}
              className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors disabled:opacity-40"
            >
              {saving ? "Creating..." : "Create"}
            </button>
            <button onClick={() => setCreating(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Initial content (optional)"
            rows={4}
            className="w-full bg-gray-900/80 border border-gray-700/60 text-gray-300 text-xs font-mono p-3 rounded-lg focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-y leading-relaxed"
          />
        </div>
      )}

      {indexFile && (
        <MemoryFileCard file={indexFile} agentName={agent.id} isIndex onRefresh={onRefresh} />
      )}

      {topicFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-gray-600 uppercase tracking-[0.12em]">Topic Files</h4>
          {topicFiles.map((f) => (
            <MemoryFileCard key={f.name} file={f} agentName={agent.id} isIndex={false} onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {!indexFile && topicFiles.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-8">
          No memory files yet. They will be created during the agent's first session.
        </p>
      )}
    </div>
  );
}
