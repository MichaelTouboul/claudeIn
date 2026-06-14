import { Brain, ChevronLeft, Database, FileText, Settings, Terminal } from 'lucide-react';
import { useState } from 'react';

import { MarkdownBody } from '@/components/_ui/MarkdownBody';
import { AgentChat } from '@/components/AgentChat/AgentChat';
import type { AgentFile, AgentFrontmatter } from '@/lib/types';
import { api } from '@/services/api';
import { useProject } from '@/store/ProjectContext';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';

import { DetailHeader } from '../DetailHeader/DetailHeader';
import { FrontmatterTable } from '../FrontmatterTable/FrontmatterTable';
import { MemoryManager } from '../MemoryManager/MemoryManager';

const TABS = ["overview", "chat", "prompt", "memory", "files"] as const;
type Tab = (typeof TABS)[number];

const tabIcons: Record<Tab, React.ReactNode> = {
  overview: <Settings size={14} />,
  chat: <Terminal size={14} />,
  prompt: <FileText size={14} />,
  memory: <Brain size={14} />,
  files: <Database size={14} />,
};

export type AgentDetailContentProps = {
  agent: AgentFile;
  onDelete: (name: string) => void;
  onAgentUpdated?: (agent: AgentFile) => void;
};

export function AgentDetailContent({
  agent,
  onDelete,
  onAgentUpdated,
}: AgentDetailContentProps) {
  const { projectId } = useProject();
  const isFavorite = useFavoritesStore((s) =>
    (s.byProject[projectId ?? ''] || []).some((f) => f.item_type === 'agent' && f.item_name === agent.id)
  );
  const onToggleFavorite = () => {
    if (projectId) void useFavoritesStore.getState().toggle(projectId, 'agent', agent.id);
  };
  const backToProject = useDashboardUIStore((s) => s.backToProject);
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

  const handleConfirmDelete = () => setConfirmDelete(true);
  const handleCancelDelete = () => setConfirmDelete(false);
  const handleDelete = () => { onDelete(agent.id); setConfirmDelete(false); };

  return (
    <div
      className={`flex-1 flex flex-col h-full ${editing ? "ring-inset rounded-lg" : ""}`}
      style={editing ? { boxShadow: 'inset 0 0 0 2px rgba(6,182,212,0.2)' } : undefined}
    >
      <button
        onClick={backToProject}
        className="flex items-center gap-1 px-4 pt-2 text-xs transition-colors w-fit"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
      >
        <ChevronLeft size={12} />
        Back to project
      </button>
      <DetailHeader
        agent={agent}
        editing={editing}
        saving={saving}
        refreshing={refreshing}
        confirmDelete={confirmDelete}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onRefreshAgent={handleRefreshAgent}
        onConfirmDelete={handleConfirmDelete}
        onCancelDelete={handleCancelDelete}
        onDelete={handleDelete}
      />

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
            color: tab === "chat" ? 'var(--color-surface-0)' : 'var(--color-text-secondary)',
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
          {tab === "overview" ? <FrontmatterTable agent={agent} editing={editing} draft={draft} onDraftChange={handleDraftChange} /> : null}
          {tab === "prompt" ? <MarkdownBody content={agent.body} /> : null}
          {tab === "memory" ? <MemoryManager agent={agent} /> : null}
          {tab === "files" ? (
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
          ) : null}
        </div>
      )}
    </div>
  );
}
