import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar } from '@/components/Dashboard/Workspace/Sidebar/Sidebar';
import { useDashboardStore } from '@/store/dashboard/useDashboardStore';
import { SidebarView, useDashboardUIStore } from '@/store/dashboard/useDashboardUIStore';
import type * as FavoritesStoreModule from '@/store/dashboard/useFavoritesStore';

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({ projectId: 'p1', projectName: 'p1', projectPath: '/p', isUserProject: false, refresh: vi.fn() }),
}));

vi.mock('@/hooks/useSessions', () => ({
  useSessions: () => ({ sessions: [], loading: false, refresh: vi.fn() }),
}));

vi.mock('@/hooks/useResizableSidebar', () => ({
  useResizableSidebar: () => ({ width: 300, ref: { current: null }, startDrag: vi.fn() }),
}));

vi.mock('@/store/dashboard/useFavoritesStore', async () => {
  const actual = await vi.importActual<typeof FavoritesStoreModule>(
    '@/store/dashboard/useFavoritesStore',
  );
  return { ...actual, useInitFavorites: () => undefined };
});

// ConversationList + LibraryNav are exercised by their own tests; stub them to
// simple markers so this test focuses on the switch shell + footer.
vi.mock('@/components/Dashboard/Workspace/Sidebar/ConversationList/ConversationList', () => ({
  ConversationList: () => <div data-testid="conversation-list" />,
}));
vi.mock('@/components/Dashboard/Workspace/Sidebar/LibraryNav/LibraryNav', () => ({
  LibraryNav: () => <div data-testid="library-nav" />,
}));

const uiInitial = useDashboardUIStore.getState();

beforeEach(() => {
  useDashboardUIStore.setState(uiInitial, true);
  useDashboardStore.setState({ agents: [], skills: [], hooks: [], mcp: [] });
});

describe('Sidebar switch', () => {
  it('shows the conversation list in Sessions mode (the default)', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
    expect(screen.queryByTestId('library-nav')).not.toBeInTheDocument();
    expect(screen.getByText('New session')).toBeInTheDocument();
  });

  it('toggling the SegmentedControl swaps to Library and persists in the store', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('tab', { name: 'Library' }));

    expect(useDashboardUIStore.getState().sidebarView).toBe(SidebarView.Library);
    expect(screen.getByTestId('library-nav')).toBeInTheDocument();
    expect(screen.queryByTestId('conversation-list')).not.toBeInTheDocument();
    // Footer affordance flips per mode.
    expect(screen.getByText('Install from plugin')).toBeInTheDocument();
    expect(screen.queryByText('New session')).not.toBeInTheDocument();
  });

  it('renders Library mode straight away when the store says so (survives unmount)', () => {
    useDashboardUIStore.getState().setSidebarView(SidebarView.Library);
    render(<Sidebar />);
    expect(screen.getByTestId('library-nav')).toBeInTheDocument();
  });
});
