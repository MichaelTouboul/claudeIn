import { BarChart3, GitBranch, History } from "lucide-react";

import { AgentChat } from '@/components/AgentChat/AgentChat';
import { AgentDetail } from '@/components/AgentDetail/AgentDetail';
import { AgentTree } from '@/components/AgentTree/AgentTree';
import { CostDashboard } from '@/components/CostDashboard/CostDashboard';
import { SessionViewer } from '@/components/SessionViewer/SessionViewer';
import type { AgentContext } from '@/hooks/useIPC';
import type { SkillFile } from '@/hooks/useProjects';
import type { SessionConversation,SessionSummary } from '@/hooks/useSessions';
import type { AgentFile } from '@/types/agent.types';

import { SkillDetail } from '../SkillDetail/SkillDetail';
import type { MainView } from '../types';
import { LandingPage } from './LandingPage';

export type MainContentProps = {
  view: MainView;
  agents: AgentFile[];
  selectedAgent: AgentFile | null;
  selectedSkill: SkillFile | null;
  resumeChat: { agentName: string; sessionId: string; message: string } | null;
  conversation: SessionConversation | null;
  conversationLoading: boolean;
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
  currentTools?: Map<string, string>;
  sessions: SessionSummary[];
  projectName: string;
  projectId: string;
  projectPath: string;
  isFavorite: (type: 'agent' | 'skill' | 'hook', name: string) => boolean;
  toggleFavorite: (type: 'agent' | 'skill' | 'hook', name: string) => void;
  onRefresh: () => void;
  onAgentUpdated: (agent: AgentFile) => void;
  onSelectAgent: (a: AgentFile) => void;
  onSessionResume: (sessionId: string, message: string) => void;
  onSetView: (view: MainView) => void;
  onAddOpenChat: (agentName: string, title: string) => string;
  onStartChat: (agentName: string, sessionId: string, message: string) => void;
  onSelectSession: (s: SessionSummary) => void;
};

export function MainContent({
  view,
  agents,
  selectedAgent,
  selectedSkill,
  resumeChat,
  conversation,
  conversationLoading,
  activeAgents,
  agentContexts,
  currentTools,
  sessions,
  projectName,
  projectId,
  projectPath,
  isFavorite,
  toggleFavorite,
  onRefresh,
  onAgentUpdated,
  onSelectAgent,
  onSessionResume,
  onSetView,
  onAddOpenChat,
  onStartChat,
  onSelectSession,
}: MainContentProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div
        className="flex items-center gap-1 px-4 py-2"
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-1)',
        }}
      >
        {([
          { key: "tree" as MainView, icon: <GitBranch size={13} />, label: "Tree" },
          { key: "session" as MainView, icon: <History size={13} />, label: "Sessions" },
          { key: "costs" as MainView, icon: <BarChart3 size={13} />, label: "Costs" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSetView(tab.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.02em',
              ...(view === tab.key ? {
                background: 'var(--color-surface-3)',
                color: 'var(--color-text-primary)',
                boxShadow: '0 0 8px rgba(6, 182, 212, 0.06)',
              } : {
                color: 'var(--color-text-muted)',
              }),
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {view === "agent" && selectedAgent ? (
          <AgentDetail
            agent={selectedAgent}
            onDelete={() => {}}
            onRefresh={onRefresh}
            onAgentUpdated={onAgentUpdated}
            isFavorite={isFavorite("agent", selectedAgent.id)}
            onToggleFavorite={() => toggleFavorite("agent", selectedAgent.id)}
          />
        ) : view === "skill" && selectedSkill ? (
          <SkillDetail
            skill={selectedSkill}
            isFavorite={isFavorite("skill", selectedSkill.name)}
            onToggleFavorite={() => toggleFavorite("skill", selectedSkill.name)}
          />
        ) : view === "tree" ? (
          <AgentTree
            agents={agents}
            activeAgents={activeAgents}
            agentContexts={agentContexts}
            currentTools={currentTools}
            selectedId={selectedAgent?.id ?? null}
            onSelect={onSelectAgent}
          />
        ) : view === "session" ? (
          <SessionViewer
            conversation={conversation}
            loading={conversationLoading}
            onResume={onSessionResume}
          />
        ) : view === "chat" && resumeChat ? (
          <AgentChat
            agentName={resumeChat.agentName}
            resumeSessionId={resumeChat.sessionId}
            initialMessage={resumeChat.message}
          />
        ) : view === "costs" ? (
          <CostDashboard />
        ) : (
          <LandingPage
            agents={agents}
            sessions={sessions}
            projectName={projectName}
            projectId={projectId}
            projectPath={projectPath}
            onSetView={onSetView}
            onAddOpenChat={onAddOpenChat}
            onStartChat={onStartChat}
            onSelectAgent={onSelectAgent}
            onSelectSession={onSelectSession}
          />
        )}
      </div>
    </div>
  );
}
