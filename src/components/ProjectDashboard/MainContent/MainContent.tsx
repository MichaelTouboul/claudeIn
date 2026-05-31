import { AgentChat } from '@/components/AgentChat/AgentChat';
import { AgentDetail } from '@/components/AgentDetail/AgentDetail';
import { SessionViewer } from '@/components/SessionViewer/SessionViewer';
import type { SessionConversation, SessionSummary } from '@/hooks/useSessions';
import { useChatsStore } from '@/store/useChatsStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';

import { ProjectView } from '../ProjectView/ProjectView';
import { SkillDetail } from '../SkillDetail/SkillDetail';

export type MainContentProps = {
  conversation: SessionConversation | null;
  conversationLoading: boolean;
  sessions: SessionSummary[];
};

export function MainContent({ conversation, conversationLoading, sessions }: MainContentProps) {
  const view = useDashboardUIStore((s) => s.view);
  const selectedAgent = useDashboardUIStore((s) => s.selectedAgent);
  const selectedSkill = useDashboardUIStore((s) => s.selectedSkill);
  const resumeChat = useDashboardUIStore((s) => s.resumeChat);
  const setView = useDashboardUIStore((s) => s.setView);
  const setResumeChat = useDashboardUIStore((s) => s.setResumeChat);
  const onAgentUpdated = useDashboardUIStore((s) => s.setSelectedAgent);
  const addOpenChat = useChatsStore((s) => s.addOpenChat);

  const onSessionResume = (sessionId: string, message: string) => {
    const session = sessions.find((s) => s.sessionId === sessionId);
    const agentName = session?.agentName || 'claude';
    addOpenChat(agentName, `Resume: ${session?.title || agentName}`);
    setResumeChat({ agentName, sessionId, message });
    setView('chat');
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === "agent" && selectedAgent ? (
          <AgentDetail agent={selectedAgent} onDelete={() => {}} onAgentUpdated={onAgentUpdated} />
        ) : view === "skill" && selectedSkill ? (
          <SkillDetail skill={selectedSkill} />
        ) : view === "session" ? (
          <SessionViewer conversation={conversation} loading={conversationLoading} onResume={onSessionResume} />
        ) : view === "chat" && resumeChat ? (
          <AgentChat agentName={resumeChat.agentName} resumeSessionId={resumeChat.sessionId} initialMessage={resumeChat.message} />
        ) : (
          <ProjectView />
        )}
      </div>
    </div>
  );
}
