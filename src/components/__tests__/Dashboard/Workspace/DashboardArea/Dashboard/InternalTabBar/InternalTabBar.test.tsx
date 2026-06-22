import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InternalTabBar } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/InternalTabBar/InternalTabBar';
import { useConversationTitlesStore } from '@/store/dashboard/useConversationTitlesStore';
import { diffTabId, PanelTabKind, usePanelStore, workflowTabId } from '@/store/dashboard/usePanelStore';
import type { Dashboard, InternalTab } from '@/store/useWorkspaceStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

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
  usePanelStore.setState({ isOpen: false, current: null });
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

    const { getByText, queryByText } = render(<InternalTabBar repoPath="/home" claudeSessionId={null} />);
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

    const { getByText } = render(<InternalTabBar repoPath="/home" claudeSessionId={null} />);
    expect(getByText('AI label')).not.toBeNull();
  });

  it('keeps the raw tab title when the store has no entry for the conversation', () => {
    useWorkspaceStore.setState({
      dashboards: [dashboardWith(sessionTab())],
      activeDashboardId: 'dash-1',
    });

    const { getByText } = render(<InternalTabBar repoPath="/home" claudeSessionId={null} />);
    expect(getByText('Old raw title')).not.toBeNull();
  });
});

// Radix DropdownMenu uses pointer capture (absent in jsdom); open via keyboard.
function openLauncher(getByRole: ReturnType<typeof render>['getByRole']) {
  const trigger = getByRole('button', { name: 'Open panel' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'Enter' });
}

describe('InternalTabBar panel launcher', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      dashboards: [dashboardWith(sessionTab())],
      activeDashboardId: 'dash-1',
    });
  });

  it('lists Diff, Workflow, Context and Plan items', async () => {
    const { getByRole, findByText, getByText } = render(
      <InternalTabBar repoPath="/home" claudeSessionId="conv-1" />,
    );
    openLauncher(getByRole);

    expect(await findByText('Diff')).not.toBeNull();
    expect(getByText('Workflow')).not.toBeNull();
    expect(getByText('Context')).not.toBeNull();
    expect(getByText('Plan')).not.toBeNull();
  });

  it('opens the Diff panel when a repo path is present', async () => {
    const { getByRole, findByText } = render(
      <InternalTabBar repoPath="/home/repo" claudeSessionId={null} />,
    );
    openLauncher(getByRole);
    fireEvent.click(await findByText('Diff'));

    await new Promise((r) => setTimeout(r, 0));
    const current = usePanelStore.getState().current;
    expect(current?.id).toBe(diffTabId('/home/repo'));
    expect(current?.kind).toBe(PanelTabKind.Diff);
  });

  it('does not open the Diff panel when there is no repo path', async () => {
    const { getByRole, findByText } = render(
      <InternalTabBar repoPath="" claudeSessionId={null} />,
    );
    openLauncher(getByRole);
    fireEvent.click(await findByText('Diff'));

    await new Promise((r) => setTimeout(r, 0));
    expect(usePanelStore.getState().current).toBeNull();
  });

  it('opens the Workflow panel when a conversation id is present', async () => {
    const { getByRole, findByText } = render(
      <InternalTabBar repoPath="" claudeSessionId="conv-9" />,
    );
    openLauncher(getByRole);
    fireEvent.click(await findByText('Workflow'));

    await new Promise((r) => setTimeout(r, 0));
    const current = usePanelStore.getState().current;
    expect(current?.id).toBe(workflowTabId('conv-9'));
    expect(current?.kind).toBe(PanelTabKind.Workflow);
  });
});
