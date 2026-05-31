import { MessageSquare } from 'lucide-react';

import { useChatsStore } from '@/store/useChatsStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
import { useEventsStore } from '@/store/useEventsStore';

import { annotateConversations, type ConversationStatus } from './conversations';

const colorHex: Record<string, string> = {
  cyan: '#06b6d4', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', orange: '#f97316', red: '#ef4444',
  purple: '#a855f7', pink: '#ec4899',
};

const statusDot: Record<ConversationStatus, { color: string; pulse: boolean }> = {
  live: { color: '#22c55e', pulse: true },
  waiting: { color: '#eab308', pulse: true },
  idle: { color: 'var(--color-text-muted)', pulse: false },
};

export function ConversationList() {
  const openChats = useChatsStore((s) => s.openChats);
  const agents = useDashboardStore((s) => s.agents);
  const activeAgents = useEventsStore((s) => s.activeAgents);
  const waitingAgents = useEventsStore((s) => s.waitingAgents);
  const setActiveConversation = useDashboardUIStore((s) => s.setActiveConversation);
  const setView = useDashboardUIStore((s) => s.setView);

  const conversations = annotateConversations(openChats, activeAgents, waitingAgents);

  if (conversations.length === 0) {
    return (
      <p className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
        No active conversations.
      </p>
    );
  }

  return (
    <div className="px-3 pb-2 space-y-0.5">
      {conversations.map((conv) => {
        const agent = agents.find((a) => a.frontmatter.name === conv.agentName || a.id === conv.agentName);
        const dot = statusDot[conv.status];
        const iconColor = colorHex[agent?.frontmatter?.color || ''] || '#06b6d4';
        return (
          <button
            key={conv.id}
            onClick={() => {
              setActiveConversation(conv.id);
              setView('project');
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left"
            style={{ background: 'transparent', animation: conv.isNew ? 'chatSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : undefined }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <MessageSquare size={12} style={{ color: iconColor }} className="shrink-0" />
            <span className="text-xs truncate" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
              {conv.title}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto"
              style={{ backgroundColor: dot.color, animation: dot.pulse ? 'pulse 1s ease-in-out infinite' : undefined }}
              title={conv.status}
            />
          </button>
        );
      })}
    </div>
  );
}
