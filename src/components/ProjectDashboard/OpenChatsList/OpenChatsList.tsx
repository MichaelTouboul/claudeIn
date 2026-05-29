import { MessageSquare } from 'lucide-react';

import { useDashboardStore } from '@/store/useDashboardStore';
import { useEventsStore } from '@/store/useEventsStore';
import type { AgentFile } from '@/types/agent.types';

import type { OpenChat } from '../types';

const colorHex: Record<string, string> = {
  cyan: '#06b6d4', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', orange: '#f97316', red: '#ef4444',
  purple: '#a855f7', pink: '#ec4899',
};

export type OpenChatsListProps = {
  openChats: OpenChat[];
  onSelectAgent: (agent: AgentFile) => void;
};

export function OpenChatsList({
  openChats,
  onSelectAgent,
}: OpenChatsListProps) {
  const agents = useDashboardStore((s) => s.agents);
  const activeAgents = useEventsStore((s) => s.activeAgents);
  if (openChats.length === 0) return null;

  return (
    <div className="px-3 pb-2" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          Chats
        </span>
      </div>
      <div className="space-y-0.5">
        {openChats.map((chat) => {
          const agent = agents.find((a) => a.frontmatter.name === chat.agentName || a.id === chat.agentName);
          const dotColor = colorHex[agent?.frontmatter?.color || ''] || '#06b6d4';
          const isActive = activeAgents.has(chat.agentName);

          return (
            <button
              key={chat.id}
              onClick={() => {
                if (agent) onSelectAgent(agent);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left"
              style={{
                background: 'transparent',
                animation: chat.isNew ? 'chatSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <MessageSquare size={12} style={{ color: dotColor }} className="shrink-0" />
              <span
                className="text-xs truncate"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
              >
                {chat.title}
              </span>
              {isActive ? (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto"
                  style={{
                    backgroundColor: dotColor,
                    animation: 'pulse 1s ease-in-out infinite',
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
