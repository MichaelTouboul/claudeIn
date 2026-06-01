import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '@/store/useAppStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { Project } from '@/types/dashboard.types';

import { Workspace } from './Workspace';

// The bug: Workspace unmounts the whole DashboardArea subtree when the global
// selectedProject becomes null (e.g. openLauncher()). That destroys every
// mounted AgentChat. We tag each rendered tab body with a stable instance id so
// we can prove its DOM identity is preserved across a scope/project switch.

let instanceSeq = 0;

vi.mock('./DashboardArea/Dashboard/DashboardSurface/TabBody', () => ({
  TabBody: ({ tab }: { tab: { id: string } }) => {
    // Capture a unique instance id ONCE per mount (useRef survives re-renders but
    // not unmount/remount). If the node is unmounted and recreated, this value
    // changes — that is the regression we guard against.
    const ref = useRef<string | null>(null);
    if (ref.current === null) ref.current = `inst-${++instanceSeq}`;
    return (
      <div data-testid={`tabbody-${tab.id}`} data-instance={ref.current}>
        chat:{tab.id}
      </div>
    );
  },
}));

// Sidebar and Console pull in window.api / heavy leaves; stub them out so the
// test stays focused on the Workspace gate + DashboardSurface keep-alive.
vi.mock('./Sidebar/Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar" /> }));
vi.mock('./DashboardArea/Console/Console', () => ({ Console: () => <div data-testid="console" /> }));

const proj = (id: string): Project => ({
  id, name: id, path: `/p/${id}`, claudeDir: `/p/${id}/.claude`,
  hasAgents: false, hasSkills: false, hasSettings: false, agentCount: 0, skillCount: 0,
});

const initialWorkspace = useWorkspaceStore.getState();
beforeEach(() => {
  instanceSeq = 0;
  useWorkspaceStore.setState(initialWorkspace, true);
  useAppStore.setState({ selectedProject: null });
  // Simulate the global dashboard store mid/post load; the fix must not depend
  // on this being populated to keep the chat mounted.
  useDashboardStore.setState({ project: null, loading: false });
});

describe('Workspace keep-alive across scope/project switches', () => {
  it('keeps the active project dashboard chat mounted when a launcher is opened (selectedProject -> null)', () => {
    const idA = useWorkspaceStore.getState().openDashboard(proj('a'));
    const tabA = useWorkspaceStore.getState().dashboards.find((d) => d.id === idA)!.tabs[0].id;

    const { rerender } = render(<Workspace projects={[proj('a')]} />);

    const chatA = screen.getByTestId(`tabbody-${tabA}`);
    expect(chatA).toBeInTheDocument();
    const instanceA = chatA.getAttribute('data-instance');

    // Click "+": opens a launcher dashboard, which sets selectedProject = null.
    useWorkspaceStore.getState().openLauncher();
    expect(useAppStore.getState().selectedProject).toBeNull();
    rerender(<Workspace projects={[proj('a')]} />);

    // The original chat must STILL be mounted (hidden) — same DOM node, same
    // instance id. Before the fix, Workspace returned the empty-state grid here
    // and this node was destroyed.
    const stillChatA = screen.getByTestId(`tabbody-${tabA}`);
    expect(stillChatA).toBe(chatA);
    expect(stillChatA.getAttribute('data-instance')).toBe(instanceA);
  });

  it('keeps the first chat mounted when switching to a second project and back', () => {
    const idA = useWorkspaceStore.getState().openDashboard(proj('a'));
    const tabA = useWorkspaceStore.getState().dashboards.find((d) => d.id === idA)!.tabs[0].id;

    const { rerender } = render(<Workspace projects={[proj('a'), proj('b')]} />);
    const chatA = screen.getByTestId(`tabbody-${tabA}`);
    const instanceA = chatA.getAttribute('data-instance');

    // Open a second project dashboard; useDashboardStore.load() would set
    // loading:true in the real app — emulate that here.
    useWorkspaceStore.getState().openDashboard(proj('b'));
    useDashboardStore.setState({ loading: true });
    rerender(<Workspace projects={[proj('a'), proj('b')]} />);

    // A is backgrounded but still mounted.
    expect(screen.getByTestId(`tabbody-${tabA}`)).toBe(chatA);

    // Switch back to A.
    useWorkspaceStore.getState().setActiveDashboard(idA);
    useDashboardStore.setState({ loading: false });
    rerender(<Workspace projects={[proj('a'), proj('b')]} />);

    const reactivatedA = screen.getByTestId(`tabbody-${tabA}`);
    expect(reactivatedA).toBe(chatA);
    expect(reactivatedA.getAttribute('data-instance')).toBe(instanceA);
  });
});
