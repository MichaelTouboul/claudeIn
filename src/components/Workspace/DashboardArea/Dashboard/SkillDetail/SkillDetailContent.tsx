import { Star, Terminal, Wrench } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/_ui/Badge';
import { AgentChat } from '@/components/AgentChat/AgentChat';
import type { SkillTab } from '@/components/Workspace/types';
import type { SkillFile } from '@/hooks/useProjects';
import { useProject } from '@/store/ProjectContext';
import { useFavoritesStore } from '@/store/useFavoritesStore';

import { SkillFiles } from './SkillFiles';
import { SkillOverview } from './SkillOverview';
import { SkillPrompt } from './SkillPrompt';

export type SkillDetailContentProps = {
  skill: SkillFile;
};

export function SkillDetailContent({ skill }: SkillDetailContentProps) {
  const { projectId } = useProject();
  const isFavorite = useFavoritesStore((s) =>
    (s.byProject[projectId ?? ''] || []).some((f) => f.item_type === 'skill' && f.item_name === skill.name)
  );
  const onToggleFavorite = () => {
    if (projectId) void useFavoritesStore.getState().toggle(projectId, 'skill', skill.name);
  };
  const [tab, setTab] = useState<SkillTab>("chat");

  const tabs: { key: SkillTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "chat", label: "Chat" },
    { key: "prompt", label: "Prompt" },
    { key: "files", label: `Files${skill.annexFiles.length > 0 ? ` (${skill.annexFiles.length})` : ""}` },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Wrench size={16} className="text-active" />
          <h2 className="text-lg font-bold text-white">{skill.name}</h2>
          <button
            onClick={onToggleFavorite}
            className="p-1 rounded hover:bg-surface-2 transition-colors"
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star size={16} className={isFavorite ? "text-yellow-400 fill-yellow-400" : "text-fg-subtle hover:text-yellow-400"} />
          </button>
          <Badge shape="pill" variant={skill.scope === "user" ? "yellow" : "cyan"}>
            {skill.scope}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 border-b border-border">
        <button
          onClick={() => setTab("chat")}
          className={`flex items-center gap-1.5 px-3 py-1.5 my-1.5 mr-2 text-xs font-medium rounded-lg transition-colors ${
            tab === "chat"
              ? "bg-accent text-white"
              : "bg-surface-3 text-fg hover:bg-surface-3"
          }`}
        >
          <Terminal size={12} />
          Chat
        </button>
        <div className="w-px h-4 bg-surface-3 mr-1" />
        {tabs.filter((t) => t.key !== "chat").map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-accent text-accent"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "chat" ? (
        <div className="flex-1 min-h-0 p-3">
          <AgentChat agentName={skill.name} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {tab === "overview" ? <SkillOverview skill={skill} /> : null}
          {tab === "prompt" ? <SkillPrompt skill={skill} /> : null}
          {tab === "files" ? <SkillFiles skill={skill} /> : null}
        </div>
      )}
    </div>
  );
}
