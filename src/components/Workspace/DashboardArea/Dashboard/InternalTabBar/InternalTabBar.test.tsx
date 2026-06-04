import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useConversationTitlesStore } from '@/store/useConversationTitlesStore';
import type { Dashboard, InternalTab } from '@/store/useWorkspaceStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { InternalTabBar } from './InternalTabBar';

const sessionTab = (over: Partial<InternalTab> = {}): InternalTab => ({
  id: 'tab-1',
  kind: 'session',
  title: 'Old raw title',
  sessionId: 'sess-abc',
  ...over,
});

const dashboardWith = (tab: InternalTab): Dashboard => ({
  id: 'dash-1',
  scope: { kind: 'user' },
  cwd: '/home',
  tabs: [tab],
  activeTabId: tab.id,
});

beforeEach(() => {
  useConversationTitlesStore.setState({ conversationTitles: {} });
});
afterEach(() => {
  useWorkspaceStore.setState({ dashboards: [], activeDashboardId: null });
  useConversationTitlesStore.setState({ conversationTitles: {} });
});

describe('InternalTabBar title overlay', () => {
  it('shows the store userTitle on a session tab over the raw tab title', () => {
    useWorkspaceStore.setState({
      dashboards: [dashboardWith(sessionTab())],
      activeDashboardId: 'dash-1',
    });
    useConversationTitlesStore.setState({
      conversationTitles: { 'sess-abc': { aiTitle: 'AI label', userTitle: 'My rename' } },
    });

    const { getByText, queryByText } = render(<InternalTabBar onOpenPanel={() => {}} />);
    expect(getByText('My rename')).not.toBeNull();
    expect(queryByText('Old raw title')).toBeNull();
  });

  it('falls back to the store aiTitle when there is no userTitle', () => {
    useWorkspaceStore.setState({
      dashboards: [dashboardWith(sessionTab())],
      activeDashboardId: 'dash-1',
    });
    useConversationTitlesStore.setState({
      conversationTitles: { 'sess-abc': { aiTitle: 'AI label', userTitle: null } },
    });

    const { getByText } = render(<InternalTabBar onOpenPanel={() => {}} />);
    expect(getByText('AI label')).not.toBeNull();
  });

  it('keeps the raw tab title when the store has no entry for the conversation', () => {
    useWorkspaceStore.setState({
      dashboards: [dashboardWith(sessionTab())],
      activeDashboardId: 'dash-1',
    });

    const { getByText } = render(<InternalTabBar onOpenPanel={() => {}} />);
    expect(getByText('Old raw title')).not.toBeNull();
  });
});
