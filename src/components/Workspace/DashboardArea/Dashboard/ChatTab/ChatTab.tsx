import { AgentChat } from '@/components/AgentChat/AgentChat';
import { useAppStore } from '@/store/useAppStore';

export type ChatTabProps = {
  agentName: string;
  tabId: string;
};

export function ChatTab({ agentName, tabId }: ChatTabProps) {
  const projectPath = useAppStore((s) => s.selectedProject?.path);

  if (!projectPath) {
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
      <AgentChat key={tabId} agentName={agentName} />
    </div>
  );
}
