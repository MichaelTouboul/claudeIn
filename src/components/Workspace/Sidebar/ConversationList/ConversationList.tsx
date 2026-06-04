import { useEventsStore } from '@/store/useEventsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { ConversationItem } from './ConversationItem/ConversationItem';

export function ConversationList() {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
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
        // other kinds keep their literal agentName.
        const name = tab.kind === 'chat' ? tab.agentName || '_main' : tab.agentName ?? '';
        const status = waitingAgents.has(name) ? 'waiting' : activeAgents.has(name) ? 'live' : 'idle';
        const isActive = tab.id === active?.activeTabId;
        return (
          <ConversationItem
            key={tab.id}
            tab={tab}
            isActive={isActive}
            status={status}
            onActivate={() => setActiveTab(tab.id)}
          />
        );
      })}
    </div>
  );
}
