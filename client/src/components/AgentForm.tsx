import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import type { AgentFile } from "../types/agent.types";
import { api } from "../services/api";

const MODELS = ["opus", "sonnet", "haiku", "inherit"];
const COLORS = ["cyan", "blue", "green", "yellow", "orange", "red", "purple", "pink"];
const MEMORY_SCOPES = ["", "user", "project", "local"];

type Props = {
  agent?: AgentFile | null;
  onClose: () => void;
  onSave: () => void;
};

export default function AgentForm({ agent, onClose, onSave }: Props) {
  const isEdit = !!agent;

  const [name, setName] = useState(agent?.frontmatter.name || "");
  const [description, setDescription] = useState(agent?.frontmatter.description || "");
  const [model, setModel] = useState(agent?.frontmatter.model || "sonnet");
  const [color, setColor] = useState(agent?.frontmatter.color || "cyan");
  const [maxTurns, setMaxTurns] = useState(String(agent?.frontmatter.maxTurns || 20));
  const [memory, setMemory] = useState(agent?.frontmatter.memory || "");
  const [tools, setTools] = useState(
    Array.isArray(agent?.frontmatter.tools)
      ? agent.frontmatter.tools.join(", ")
      : agent?.frontmatter.tools || ""
  );
  const [disallowedTools, setDisallowedTools] = useState(
    Array.isArray(agent?.frontmatter.disallowedTools)
      ? agent.frontmatter.disallowedTools.join(", ")
      : agent?.frontmatter.disallowedTools || ""
  );
  const [body, setBody] = useState(agent?.body || "");
  const [folder, setFolder] = useState(agent?.folder || "");
  const [folders, setFolders] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getFolders().then(setFolders);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const frontmatter: Record<string, unknown> = {
        name,
        description,
        model,
        color,
        maxTurns: parseInt(maxTurns) || 20,
      };
      if (memory) frontmatter.memory = memory;
      if (tools.trim()) {
        frontmatter.tools = tools.split(",").map((t) => t.trim()).filter(Boolean);
      }
      if (disallowedTools.trim()) {
        frontmatter.disallowedTools = disallowedTools.split(",").map((t) => t.trim()).filter(Boolean);
      }

      if (isEdit) {
        await api.updateAgent(agent.id, { frontmatter, body });
      } else {
        await api.createAgent({ folder, fileName: name, frontmatter, body });
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-[800px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? `Edit ${agent.id}` : "New Agent"}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" disabled={isEdit}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isEdit}
                placeholder="my-agent"
                className="input"
              />
            </Field>
            {!isEdit && (
              <Field label="Folder">
                <select value={folder} onChange={(e) => setFolder(e.target.value)} className="input">
                  {folders.map((f) => (
                    <option key={f} value={f}>
                      {f || "(root)"}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Model">
              <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
                {MODELS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Color">
              <div className="flex gap-2 items-center">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      color === c ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{
                      backgroundColor:
                        {
                          cyan: "#06b6d4",
                          blue: "#3b82f6",
                          green: "#22c55e",
                          yellow: "#eab308",
                          orange: "#f97316",
                          red: "#ef4444",
                          purple: "#a855f7",
                          pink: "#ec4899",
                        }[c],
                    }}
                  />
                ))}
              </div>
            </Field>
            <Field label="Max Turns">
              <input
                value={maxTurns}
                onChange={(e) => setMaxTurns(e.target.value)}
                type="number"
                className="input"
              />
            </Field>
            <Field label="Memory Scope">
              <select value={memory} onChange={(e) => setMemory(e.target.value)} className="input">
                {MEMORY_SCOPES.map((m) => (
                  <option key={m} value={m}>
                    {m || "none"}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input resize-y"
              placeholder="When to use this agent..."
            />
          </Field>

          <Field label="Tools (comma-separated)">
            <input
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              className="input"
              placeholder="Read, Grep, Glob, Bash"
            />
          </Field>

          <Field label="Disallowed Tools (comma-separated)">
            <input
              value={disallowedTools}
              onChange={(e) => setDisallowedTools(e.target.value)}
              className="input"
              placeholder="Write, Edit"
            />
          </Field>

          <Field label="Prompt (Markdown body)">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="input font-mono text-xs resize-y"
              placeholder="# Agent Name&#10;&#10;You are..."
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name || !description}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save size={14} />
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 0.5rem;
          color: #e5e7eb;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus {
          border-color: #06b6d4;
        }
        .input:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? "opacity-50" : ""}>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
