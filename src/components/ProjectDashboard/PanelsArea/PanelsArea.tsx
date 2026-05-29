import {
  Bot, Globe, History,
Settings,   Star, User,
Wrench, } from "lucide-react";
import { type ReactNode } from "react";

import { Accordion } from '@/components/_ui/Accordion';
import { SessionList } from '@/components/SessionList/SessionList';
import type { HookConfig, SkillFile } from '@/hooks/useProjects';
import type { SessionSummary } from '@/hooks/useSessions';
import { useProject } from '@/store/ProjectContext';
import { useDashboardStore } from '@/store/useDashboardStore';
import type { AgentFile } from '@/types/agent.types';

import { AgentList } from '../AgentList/AgentList';
import { HookRow } from '../HookRow/HookRow';
import { SectionLabel } from '../SectionLabel/SectionLabel';
import { SkillRow } from '../SkillRow/SkillRow';

export type PanelsAreaProps = {
  sessions: SessionSummary[];
  sessionsLoading: boolean;
  selectedAgent: AgentFile | null;
  selectedSkill: SkillFile | null;
  selectedSessionId: string | null;
  openPanels: Set<string>;
  scopeTab: 'project' | 'user';
  isUserProject: boolean;
  projectAgents: AgentFile[];
  userAgents: AgentFile[];
  projectSkills: SkillFile[];
  userSkills: SkillFile[];
  favAgents: AgentFile[];
  favSkills: SkillFile[];
  favHooks: HookConfig[];
  hasFavorites: boolean;
  isFavorite: (type: 'agent' | 'skill' | 'hook', name: string) => boolean;
  toggleFavorite: (type: 'agent' | 'skill' | 'hook', name: string) => void;
  onTogglePanel: (panel: string) => void;
  onSetScopeTab: (tab: 'project' | 'user') => void;
  onAgentAction: (action: string, agentName: string) => void;
  onSelectAgent: (a: AgentFile) => void;
  onSelectSkill: (s: SkillFile) => void;
  onSelectSession: (s: SessionSummary) => void;
  onToggleLink: (agentName: string, linked: boolean) => void;
};

export function PanelsArea({
  sessions,
  sessionsLoading,
  selectedAgent,
  selectedSkill,
  selectedSessionId,
  openPanels,
  scopeTab,
  isUserProject,
  projectAgents,
  userAgents,
  projectSkills,
  userSkills,
  favAgents,
  favSkills,
  favHooks,
  hasFavorites,
  isFavorite,
  toggleFavorite,
  onTogglePanel,
  onSetScopeTab,
  onAgentAction,
  onSelectAgent,
  onSelectSkill,
  onSelectSession,
  onToggleLink,
}: PanelsAreaProps) {
  const { refresh } = useProject();
  const agents = useDashboardStore((s) => s.agents);
  const skills = useDashboardStore((s) => s.skills);
  const hooks = useDashboardStore((s) => s.hooks);
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Spacer pushes panels to bottom when all are closed */}
      {!openPanels.size ? <div className="flex-1" /> : null}

      {([
      hasFavorites ? {
        key: "favorites",
        label: "Favorites",
        icon: <Star size={11} className="text-yellow-400" />,
        count: favAgents.length + favSkills.length + favHooks.length,
        content: (
          <>
            {favAgents.length > 0 ? <>
                <SectionLabel icon={<Bot size={10} className="text-accent" />} label="Agents" />
                <AgentList agents={favAgents} allAgents={agents} selectedId={selectedAgent?.id ?? null} onSelect={onSelectAgent} onAgentAction={onAgentAction} isAgentFavorite={(n) => isFavorite("agent", n)} />
              </> : null}
            {favSkills.length > 0 ? <>
                <SectionLabel icon={<Wrench size={10} className="text-active" />} label="Skills" />
                {favSkills.map((s) => (
                  <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} isFavorite onSelect={onSelectSkill} onToggleFavorite={() => toggleFavorite("skill", s.name)} />
                ))}
              </> : null}
            {favHooks.length > 0 ? <>
                <SectionLabel icon={<Settings size={10} className="text-yellow-400" />} label="Hooks" />
                {favHooks.map((h) => (
                  <HookRow key={`${h.event}:${h.matcher}`} hook={h} isFavorite onToggleFavorite={() => toggleFavorite("hook", `${h.event}:${h.matcher}`)} />
                ))}
              </> : null}
          </>
        ),
      } : null,
      {
        key: "agents",
        label: "Agents",
        icon: <Bot size={11} className="text-accent" />,
        count: agents.length,
        content: isUserProject ? (
          <AgentList agents={agents} allAgents={agents} selectedId={selectedAgent?.id ?? null} onSelect={onSelectAgent} onAgentAction={onAgentAction} isAgentFavorite={(n) => isFavorite("agent", n)} />
        ) : (
          <div>
            <div
              className="flex items-center gap-px px-2 mb-2 p-0.5 rounded-lg"
              style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-subtle)' }}
            >
              <button
                onClick={() => onSetScopeTab("project")}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200"
                style={scopeTab === "project" ? {
                  background: 'var(--color-accent-dim)',
                  color: 'var(--color-accent)',
                  boxShadow: 'inset 0 0 8px rgba(6,182,212,0.08)',
                } : {
                  color: 'var(--color-text-muted)',
                }}
              >
                <Globe size={10} />
                Project
                <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1", fontSize: '10px', opacity: 0.6 }}>{projectAgents.length}</span>
              </button>
              <button
                onClick={() => onSetScopeTab("user")}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200"
                style={scopeTab === "user" ? {
                  background: 'rgba(234, 179, 8, 0.1)',
                  color: '#eab308',
                  boxShadow: 'inset 0 0 8px rgba(234,179,8,0.06)',
                } : {
                  color: 'var(--color-text-muted)',
                }}
              >
                <User size={10} />
                User
                <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1", fontSize: '10px', opacity: 0.6 }}>{userAgents.length}</span>
              </button>
            </div>
            {scopeTab === "project" ? (
              projectAgents.length > 0 ? (
                <AgentList agents={projectAgents} allAgents={agents} selectedId={selectedAgent?.id ?? null} onSelect={onSelectAgent} onAgentAction={onAgentAction} onToggleLink={(name) => onToggleLink(name, true)} linkAction="unlink" isAgentFavorite={(n) => isFavorite("agent", n)} />
              ) : (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs text-fg-muted mb-1.5">No project agents</p>
                  <p className="text-[10px] text-fg-subtle leading-relaxed">Link user agents or create agents in <code className="text-accent/80 bg-accent/8 px-1 py-0.5 rounded">.claude/agents/</code></p>
                </div>
              )
            ) : (
              userAgents.length > 0 ? (
                <AgentList agents={userAgents} allAgents={agents} selectedId={selectedAgent?.id ?? null} onSelect={onSelectAgent} onAgentAction={onAgentAction} onToggleLink={(name) => onToggleLink(name, false)} linkAction="link" isAgentFavorite={(n) => isFavorite("agent", n)} />
              ) : (
                <p className="px-3 py-6 text-xs text-fg-muted text-center">No user agents</p>
              )
            )}
          </div>
        ),
      },
      (projectSkills.length > 0 || userSkills.length > 0) ? {
        key: "skills",
        label: "Skills",
        icon: <Wrench size={11} className="text-active" />,
        count: projectSkills.length + userSkills.length,
        content: isUserProject ? (
          skills.map((s) => (
            <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} isFavorite={isFavorite("skill", s.name)} onSelect={onSelectSkill} onToggleFavorite={() => toggleFavorite("skill", s.name)} />
          ))
        ) : (
          <>
            {projectSkills.length > 0 ? <>
                <SectionLabel icon={<Globe size={10} className="text-accent" />} label="Project" />
                {projectSkills.map((s) => (
                  <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} isFavorite={isFavorite("skill", s.name)} onSelect={onSelectSkill} onToggleFavorite={() => toggleFavorite("skill", s.name)} />
                ))}
              </> : null}
            {userSkills.length > 0 ? <>
                <SectionLabel icon={<User size={10} className="text-fg-muted" />} label="User" />
                <div className="opacity-60">
                  {userSkills.map((s) => (
                    <SkillRow key={s.filePath} skill={s} selected={selectedSkill?.filePath === s.filePath} isFavorite={isFavorite("skill", s.name)} onSelect={onSelectSkill} onToggleFavorite={() => toggleFavorite("skill", s.name)} />
                  ))}
                </div>
              </> : null}
          </>
        ),
      } : null,
      {
        key: "sessions",
        label: "Sessions",
        icon: <History size={11} className="text-purple-400" />,
        count: sessions.length,
        content: sessionsLoading ? (
          <p className="text-xs text-fg-subtle text-center py-4">Loading sessions...</p>
        ) : (
          <SessionList
            sessions={sessions}
            selectedId={selectedSessionId}
            onSelect={(s) => onSelectSession(s)}
          />
        ),
      },
      hooks.length > 0 ? {
        key: "hooks",
        label: "Hooks",
        icon: <Settings size={11} className="text-yellow-400" />,
        count: hooks.length,
        content: hooks.map((h) => (
          <HookRow key={`${h.event}:${h.matcher}`} hook={h} isFavorite={isFavorite("hook", `${h.event}:${h.matcher}`)} onToggleFavorite={() => toggleFavorite("hook", `${h.event}:${h.matcher}`)} />
        )),
      } : null,
      ].filter(Boolean) as { key: string; label: string; icon: ReactNode; count: number; content: ReactNode }[])
        .map((panel) => (
          <Accordion
            key={panel.key}
            label={panel.label}
            icon={panel.icon}
            count={panel.count}
            open={openPanels.has(panel.key)}
            onToggle={() => onTogglePanel(panel.key)}
            onRefresh={refresh}
            flex
          >
            {panel.content}
          </Accordion>
        ))
      }
    </div>
  );
}
