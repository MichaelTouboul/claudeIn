import { BarChart3, GitBranch, History } from "lucide-react";

import { AgentChat } from '@/components/AgentChat/AgentChat';
import { AgentDetail } from '@/components/AgentDetail/AgentDetail';
import { AgentTree } from '@/components/AgentTree/AgentTree';
import { CostDashboard } from '@/components/CostDashboard/CostDashboard';
import { SessionViewer } from '@/components/SessionViewer/SessionViewer';
import type { SessionConversation,SessionSummary } from '@/hooks/useSessions';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';

import { SkillDetail } from '../SkillDetail/SkillDetail';
import type { MainView } from '../types';
import { LandingPage } from './LandingPage';

export type MainContentProps = {
  conversation: SessionConversation | null;
  conversationLoading: boolean;
  sessions: SessionSummary[];
  onSelectSession: (s: SessionSummary) => void;
};

export function MainContent({
  conversation,
  conversationLoading,
  sessions,
  onSelectSession,
}: MainContentProps) {
  const agents = useDashboardStore((s) => s.agents);
  const view = useDashboardUIStore((s) => s.view);
  const selectedAgent = useDashboardUIStore((s) => s.selectedAgent);
  const selectedSkill = useDashboardUIStore((s) => s.selectedSkill);
  const resumeChat = useDashboardUIStore((s) => s.resumeChat);
  const setView = useDashboardUIStore((s) => s.setView);
  const setResumeChat = useDashboardUIStore((s) => s.setResumeChat);
  const onSelectAgent = useDashboardUIStore((s) => s.selectAgent);
  const onAgentUpdated = useDashboardUIStore((s) => s.setSelectedAgent);

  const onSessionResume = (sessionId: string, message: string) => {
    setResumeChat({ agentName: 'claude', sessionId, message });
    setView('chat');
  };
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
            onClick={() => setView(tab.key)}
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
            onAgentUpdated={onAgentUpdated}
          />
        ) : view === "skill" && selectedSkill ? (
          <SkillDetail skill={selectedSkill} />
        ) : view === "tree" ? (
          <AgentTree
            agents={agents}
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
            onSetView={setView}
            onSelectAgent={onSelectAgent}
            onSelectSession={onSelectSession}
          />
        )}
      </div>
    </div>
  );
}
