import { useDashboardStore } from '@/store/useDashboardStore';
import { useEventsStore } from '@/store/useEventsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { ConversationItem } from './ConversationItem/ConversationItem';

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
        // Live-event sets (activeAgents/waitingAgents) are keyed by the spawn's
        // agentName, which for the main chat is "_main" (the tab carries an empty
        // agentName). Normalize empty→"_main" for chat tabs so the dot can match;
        // other kinds keep their literal agentName. "_main" matches no real agent,
        // so the icon color simply falls back to the default — which is correct.
        const name = tab.kind === 'chat' ? tab.agentName || '_main' : tab.agentName ?? '';
        const agent = agents.find((a) => a.id === name);
        const status = waitingAgents.has(name) ? 'waiting' : activeAgents.has(name) ? 'live' : 'idle';
        const iconColor = colorHex[agent?.frontmatter?.color || ''] || '#06b6d4';
        const isActive = tab.id === active?.activeTabId;
        return (
          <ConversationItem
            key={tab.id}
            tab={tab}
            isActive={isActive}
            iconColor={iconColor}
            status={status}
            onActivate={() => setActiveTab(tab.id)}
          />
        );
      })}
    </div>
  );
}
