import {
AlertTriangle,
ChevronDown, ChevronRight,
  Clock, FileText, Plus,   Save, Trash2, X, } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/_ui/Badge";
import { Button } from "@/components/_ui/Button";
import { Input } from "@/components/_ui/Input";
import { Progress } from "@/components/_ui/Progress";
import { Textarea } from "@/components/_ui/Textarea";
import type { AgentFile, MemoryFile } from "@/lib/types";
import { api } from "@/services/api";
import { useProject } from "@/store/ProjectContext";

const MAX_LINES = 200;
const MAX_BYTES = 25 * 1024;

function SizeGauge({ label, current, max, unit }: { label: string; current: number; max: number; unit: string }) {
  const ratio = Math.min(current / max, 1);
  const percent = ratio * 100;
  const fillColor =
    percent >= 90 ? "var(--color-danger)" :
    percent >= 70 ? "#fde047" :
    "var(--color-accent)";
  const textColor =
    percent >= 90 ? "text-danger" :
    percent >= 70 ? "text-yellow-400" :
    "text-fg-muted";

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-fg-muted w-10 font-medium">{label}</span>
      <Progress value={ratio} fillColor={fillColor} trackClassName="flex-1 h-[5px]" />
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
}: {
  file: MemoryFile;
  agentName: string;
  isIndex: boolean;
}) {
  const { refresh } = useProject();
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
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${file.name}?`)) return;
    await api.deleteMemoryFile(agentName, file.name);
    await refresh();
  };

  return (
    <div className={`rounded-lg border transition-colors ${
      isIndex
        ? "border-accent/20 bg-accent/[0.03]"
        : "border-border/60 bg-surface-2/20 hover:border-border/60"
    }`}>
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-2.5 select-none text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded
          ? <ChevronDown size={12} className="text-fg-subtle shrink-0" />
          : <ChevronRight size={12} className="text-fg-subtle shrink-0" />
        }
        <FileText size={13} className={isIndex ? "text-accent/80" : "text-active/70"} />
        <span className={`text-sm font-medium ${isIndex ? "text-accent" : "text-fg"}`}>
          {file.name}
        </span>
        {isIndex ? <span className="text-[9px] font-semibold bg-accent/15 text-accent/90 px-1.5 py-0.5 rounded uppercase tracking-wider">
            index
          </span> : null}
        <span className="ml-auto flex items-center gap-2.5">
          <span className="text-[10px] text-fg-subtle flex items-center gap-1">
            <Clock size={9} />
            {daysAgo(file.lastModified)}
          </span>
          <span className="text-[10px] text-fg-subtle tabular-nums">{lines}L</span>
        </span>
      </button>

      {expanded ? <div className="px-4 pb-3 border-t border-border/30">
          {isIndex ? <div className="space-y-1.5 mt-3 mb-3">
              <SizeGauge label="Lines" current={lines} max={MAX_LINES} unit="lines" />
              <SizeGauge label="Size" current={bytes} max={MAX_BYTES} unit="B" />
              {lines > MAX_LINES * 0.8 ? <div className="flex items-center gap-1.5 text-[10px] text-yellow-400/90 mt-1">
                  <AlertTriangle size={10} />
                  Approaching limit — content past line {MAX_LINES} is truncated at session start
                </div> : null}
            </div> : null}

          <div className="flex items-center gap-2 my-2">
            {editing ? (
              <>
                <Button intent="ghost" size="sm" onClick={save} disabled={saving}>
                  <Save size={11} />{saving ? "Saving..." : "Save"}
                </Button>
                <Button intent="ghost" size="sm" onClick={() => { setContent(file.content); setEditing(false); }}>
                  <X size={11} />Cancel
                </Button>
              </>
            ) : (
              <>
                <Button intent="ghost" size="sm" onClick={() => setEditing(true)}>edit</Button>
                {!isIndex ? <Button intent="danger" size="icon" onClick={remove} title={`Delete ${file.name}`}>
                    <Trash2 size={10} />
                  </Button> : null}
              </>
            )}
          </div>

          {editing ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label={`Edit ${file.name}`}
              size="sm"
              font="mono"
              className="h-56 p-3 bg-surface-1/80 resize-y leading-relaxed"
            />
          ) : (
            <pre className="text-xs text-fg-muted whitespace-pre-wrap font-mono max-h-56 overflow-y-auto bg-surface-1/40 rounded-lg p-3 leading-relaxed">
              {file.content || "(empty)"}
            </pre>
          )}
        </div> : null}
    </div>
  );
}

export type MemoryManagerProps = {
  agent: AgentFile;
};

export function MemoryManager({
  agent,
}: MemoryManagerProps) {
  const { refresh } = useProject();
  const [creating, setCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  if (!agent.frontmatter.memory) {
    return (
      <div className="text-center py-10">
        <p className="text-fg-muted text-sm mb-2">No persistent memory configured.</p>
        <p className="text-xs text-fg-subtle leading-relaxed">
          Add <code className="text-accent/80 bg-accent/8 px-1.5 py-0.5 rounded font-mono">memory: project</code> or{" "}
          <code className="text-accent/80 bg-accent/8 px-1.5 py-0.5 rounded font-mono">memory: user</code> to frontmatter to enable.
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
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <span>Scope:</span>
          <Badge shape="pill" variant="green">
            {agent.frontmatter.memory}
          </Badge>
          <span className="text-fg-subtle text-xs font-mono tabular-nums">
            {agent.memoryFiles.length} files
          </span>
        </div>
        <Button intent="ghost" size="sm" onClick={() => setCreating(true)}>
          <Plus size={12} />
          New topic
        </Button>
      </div>

      {creating ? <div className="border border-accent/25 rounded-lg p-4 bg-accent/[0.03]">
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="topic-name.md"
              aria-label="New topic file name"
              font="mono"
              className="flex-1 bg-surface-1/80"
              autoFocus
            />
            <Button
              intent="primary"
              size="sm"
              onClick={handleCreate}
              disabled={saving || !newFileName.trim()}
            >
              {saving ? "Creating..." : "Create"}
            </Button>
            <Button intent="ghost" size="icon" onClick={() => setCreating(false)} title="Cancel">
              <X size={14} />
            </Button>
          </div>
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Initial content (optional)"
            aria-label="New topic content"
            rows={4}
            size="sm"
            font="mono"
            className="p-3 bg-surface-1/80 resize-y leading-relaxed"
          />
        </div> : null}

      {indexFile ? <MemoryFileCard file={indexFile} agentName={agent.id} isIndex /> : null}

      {topicFiles.length > 0 ? <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-fg-subtle uppercase tracking-[0.12em]">Topic Files</h4>
          {topicFiles.map((f) => (
            <MemoryFileCard key={f.name} file={f} agentName={agent.id} isIndex={false} />
          ))}
        </div> : null}

      {!indexFile && topicFiles.length === 0 ? <p className="text-fg-subtle text-sm text-center py-8">
          No memory files yet. They will be created during the agent's first session.
        </p> : null}
    </div>
  );
}
