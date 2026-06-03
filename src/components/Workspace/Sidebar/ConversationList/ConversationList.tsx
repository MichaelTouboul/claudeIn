import { MessageSquare } from 'lucide-react';

import { useDashboardStore } from '@/store/useDashboardStore';
import { useEventsStore } from '@/store/useEventsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

const colorHex: Record<string, string> = {
  cyan: '#06b6d4', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', orange: '#f97316', red: '#ef4444',
  purple: '#a855f7', pink: '#ec4899',
};

export function ConversationList() {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const agents = useDashboardStore((s) => s.agents);
  const activeAgents = useEventsStore((s) => s.activeAgents);
  const waitingAgents = useEventsStore((s) => s.waitingAgents);

  const active = dashboards.find((d) => d.id === activeDashboardId);
  const tabs =
    active?.tabs.filter((t) => t.kind === 'chat' || t.kind === 'agent' || t.kind === 'session') ?? [];

  if (tabs.length === 0) {
    return (
      <p className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
        No active conversations.
      </p>
    );
  }

  return (
    <div className="px-3 pb-2 space-y-0.5">
      {tabs.map((tab) => {
        const name = tab.agentName ?? '';
        const agent = agents.find((a) => a.id === name);
        const status = waitingAgents.has(name) ? 'waiting' : activeAgents.has(name) ? 'live' : 'idle';
        const dotColor = status === 'live' ? '#22c55e' : status === 'waiting' ? '#eab308' : 'var(--color-text-muted)';
        const iconColor = colorHex[agent?.frontmatter?.color || ''] || '#06b6d4';
        const isActive = tab.id === active?.activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left"
            style={{ background: isActive ? 'var(--color-surface-2)' : 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = isActive ? 'var(--color-surface-2)' : 'transparent')}
          >
            <MessageSquare size={12} style={{ color: iconColor }} className="shrink-0" />
            <span className="text-xs truncate" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
              {tab.title}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto"
              style={{ backgroundColor: dotColor, animation: status === 'live' ? 'pulse 1s ease-in-out infinite' : undefined }}
              title={status}
            />
          </button>
        );
      })}
    </div>
  );
}
