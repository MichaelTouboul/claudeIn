import { AgentChat } from '@/components/Dashboard/AgentChat/AgentChat';

export type ChatTabProps = {
  agentName: string;
  tabId: string;
  cwd: string;
};

export function ChatTab({ agentName, tabId, cwd }: ChatTabProps) {
  if (!cwd) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
          Select a project to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 h-full p-3">
      <AgentChat key={tabId} tabId={tabId} agentName={agentName} cwd={cwd} />
    </div>
  );
}
