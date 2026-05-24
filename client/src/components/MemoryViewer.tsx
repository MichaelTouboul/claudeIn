import { useState } from "react";
import { Save, Trash2, X, FileText } from "lucide-react";
import type { AgentFile, MemoryFile } from "../types/agent.types";
import { api } from "../services/api";

function MemoryFileCard({
  file,
  agentName,
  onRefresh,
}: {
  file: MemoryFile;
  agentName: string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(file.content);
  const [saving, setSaving] = useState(false);

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
    await api.deleteMemoryFile(agentName, file.name);
    onRefresh();
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-green-400" />
          <h4 className="text-sm font-medium text-gray-300">{file.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {new Date(file.lastModified).toLocaleDateString()}
          </span>
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={saving}
                className="p-1 text-green-400 hover:text-green-300"
              >
                <Save size={14} />
              </button>
              <button
                onClick={() => {
                  setContent(file.content);
                  setEditing(false);
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                edit
              </button>
              <button onClick={remove} className="p-1 text-gray-600 hover:text-red-400">
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>
      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-48 bg-gray-900 text-gray-300 text-xs font-mono p-3 rounded-lg border border-gray-700 focus:border-cyan-500 focus:outline-none resize-y"
        />
      ) : (
        <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
          {file.content || "(empty)"}
        </pre>
      )}
    </div>
  );
}

export default function MemoryViewer({
  agent,
  onRefresh,
}: {
  agent: AgentFile;
  onRefresh: () => void;
}) {
  if (!agent.frontmatter.memory) {
    return <p className="text-gray-500 text-sm">This agent has no persistent memory configured.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>Scope:</span>
        <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full text-xs font-medium">
          {agent.frontmatter.memory}
        </span>
        <span className="text-gray-600 text-xs font-mono ml-2">
          ~/.claude/agent-memory/{agent.id}/
        </span>
      </div>

      {agent.memoryFiles.length === 0 ? (
        <p className="text-gray-500 text-sm">No memory files yet. They will be created during the agent's first session.</p>
      ) : (
        agent.memoryFiles.map((f) => (
          <MemoryFileCard key={f.name} file={f} agentName={agent.id} onRefresh={onRefresh} />
        ))
      )}
    </div>
  );
}
