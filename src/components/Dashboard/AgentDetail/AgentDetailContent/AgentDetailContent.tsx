import { useState } from 'react';

import { Input } from '@/components/_ui/Input';
import type { AgentFile, AgentFrontmatter } from '@/lib/types';
import { api } from '@/services/api';
import { useDashboardUIStore } from '@/store/dashboard/useDashboardUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { AgentHeader } from '../AgentHeader/AgentHeader';
import { ConfigRail } from '../ConfigRail/ConfigRail';
import { SystemPromptCard } from '../SystemPromptCard/SystemPromptCard';
import { Breadcrumb } from './Breadcrumb';

export type AgentDetailContentProps = {
  agent: AgentFile;
  onDelete: (name: string) => void;
  onAgentUpdated?: (agent: AgentFile) => void;
};

/**
 * Single-page agent configuration: breadcrumb topbar, identity header, prose
 * description, and a two-column body (system prompt + configuration rail).
 * Editing is inline — Save round-trips the frontmatter draft AND an edited body
 * through `updateAgent` (the same write path as before), then bubbles up.
 */
export function AgentDetailContent({ agent, onDelete, onAgentUpdated }: AgentDetailContentProps) {
  const backToProject = useDashboardUIStore((s) => s.backToProject);
  const addTab = useWorkspaceStore((s) => s.addTab);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<AgentFrontmatter>>({});
  const [bodyDraft, setBodyDraft] = useState(agent.body);

  const handleEdit = () => {
    setDraft({});
    setBodyDraft(agent.body);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft({});
    setBodyDraft(agent.body);
    setEditing(false);
  };

  const handleRun = () => {
    addTab({ kind: 'chat', title: agent.id, agentName: agent.id });
  };

  const handleDraftChange = (key: keyof AgentFrontmatter & string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const frontmatterChanged = Object.keys(draft).length > 0;
    const bodyChanged = bodyDraft !== agent.body;
    if (!frontmatterChanged && !bodyChanged) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const payload: { frontmatter?: Partial<AgentFrontmatter>; body?: string } = {};
      if (frontmatterChanged) payload.frontmatter = draft;
      if (bodyChanged) payload.body = bodyDraft;
      const updated = await api.updateAgent(agent.id, payload);
      setEditing(false);
      setDraft({});
      onAgentUpdated?.(updated);
    } finally {
      setSaving(false);
    }
  };

  const description =
    'description' in draft
      ? String(draft.description ?? '')
      : String(agent.frontmatter.description ?? '');

  return (
    <div className="flex h-full flex-1 flex-col">
      <Breadcrumb onBack={backToProject} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1040px] px-7 pb-16 pt-6">
          <AgentHeader
            agent={agent}
            editing={editing}
            saving={saving}
            onRun={handleRun}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            onDuplicate={() => {}}
            onReveal={() => {}}
            onDelete={() => onDelete(agent.id)}
          />

          {editing ? (
            <div className="mt-5 max-w-[70ch]">
              <div className="mb-1.5 text-xs text-fg-subtle">Description</div>
              <Input
                aria-label="Description"
                value={description}
                onChange={(e) => handleDraftChange('description', e.target.value)}
              />
            </div>
          ) : (
            <p className="mt-4 max-w-[70ch] text-[15px] leading-relaxed text-fg-muted">
              {description}
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_320px]">
            <SystemPromptCard
              body={agent.body}
              editing={editing}
              value={bodyDraft}
              onChange={setBodyDraft}
            />
            <ConfigRail agent={agent} editing={editing} draft={draft} onChange={handleDraftChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
