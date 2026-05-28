import { useState } from 'react';
import { Star, Terminal, Wrench } from 'lucide-react';

import type { SkillFile } from '@/hooks/useProjects';
import { AgentChat } from '@/components/AgentChat/AgentChat';
import type { SkillTab } from '../types';
import { SkillOverview } from './SkillOverview';
import { SkillPrompt } from './SkillPrompt';
import { SkillFiles } from './SkillFiles';

export type SkillDetailProps = {
  skill: SkillFile;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
};

export function SkillDetail({ skill, isFavorite, onToggleFavorite }: SkillDetailProps) {
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
          <Wrench size={16} className="text-green-400" />
          <h2 className="text-lg font-bold text-white">{skill.name}</h2>
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="p-1 rounded hover:bg-gray-800 transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star size={16} className={isFavorite ? "text-yellow-400 fill-yellow-400" : "text-gray-600 hover:text-yellow-400"} />
            </button>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            skill.scope === "user" ? "bg-yellow-500/15 text-yellow-400" : "bg-cyan-500/15 text-cyan-400"
          }`}>
            {skill.scope}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 border-b border-gray-800">
        <button
          onClick={() => setTab("chat")}
          className={`flex items-center gap-1.5 px-3 py-1.5 my-1.5 mr-2 text-xs font-medium rounded-lg transition-colors ${
            tab === "chat"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <Terminal size={12} />
          Chat
        </button>
        <div className="w-px h-4 bg-gray-700 mr-1" />
        {tabs.filter((t) => t.key !== "chat").map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
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
