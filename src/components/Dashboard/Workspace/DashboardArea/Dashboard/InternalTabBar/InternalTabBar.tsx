import { Menu } from 'lucide-react';

import { Flex } from '@/components/_ui/Flex';
import { type TabItem,Tabs } from '@/components/_ui/Tabs';
import { useConversationTitlesStore } from '@/store/dashboard/useConversationTitlesStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { AddTabMenu } from './AddTabMenu';

export type InternalTabBarProps = {
  onOpenPanel: () => void;
};

export function InternalTabBar({ onOpenPanel }: InternalTabBarProps) {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const conversationTitles = useConversationTitlesStore((s) => s.conversationTitles);

  const active = dashboards.find((d) => d.id === activeDashboardId);
  if (!active) return null;

  const tabs: TabItem[] = active.tabs.map((t) => {
    // Mirror ConversationList: overlay the shared titles store so a rename shows
    // live on the panel tab. session tabs key on sessionId, chat tabs on
    // claudeSessionId; tabs without one fall back to the tab's own title.
    const convId = t.kind === 'session' ? t.sessionId : t.claudeSessionId;
    const entry = convId ? conversationTitles[convId] : undefined;
    const label = entry?.userTitle ?? entry?.aiTitle ?? t.title;
    return { key: t.id, label, onClose: closeTab };
  });

  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      <div className="flex items-center min-w-0">
        <Tabs tabs={tabs} active={active.activeTabId} onChange={setActiveTab} className="min-w-0 overflow-x-auto" />
        <AddTabMenu />
      </div>
      <Flex
        as="button"
        align="center"
        justify="center"
        onClick={onOpenPanel}
        title="Context · Task · Plan"
        className="w-7 h-7 rounded-md mr-2 shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Menu size={16} />
      </Flex>
    </div>
  );
}
