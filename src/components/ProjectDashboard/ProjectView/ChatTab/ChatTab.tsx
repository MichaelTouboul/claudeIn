import { AgentChat } from '@/components/AgentChat/AgentChat';
import { useAppStore } from '@/store/useAppStore';
import { useChatsStore } from '@/store/useChatsStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';

export function ChatTab() {
  const projectPath = useAppStore((s) => s.selectedProject?.path);
  const activeConversationId = useDashboardUIStore((s) => s.activeConversationId);
  const openChats = useChatsStore((s) => s.openChats);

  if (!projectPath) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
          Select a project to start chatting.
        </p>
      </div>
    );
  }

  const active = openChats.find((c) => c.id === activeConversationId);
  const agentName = active?.agentName ?? '';
  const key = active?.id ?? 'general';

  return (
    <div className="flex-1 min-h-0 h-full p-3">
      <AgentChat key={key} agentName={agentName} />
    </div>
  );
}
