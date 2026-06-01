import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '@/store/useAppStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { Project } from '@/types/dashboard.types';

import { DashboardSurface } from './DashboardSurface';

// Mock TabBody with a stateful component. Each instance owns local useState;
// if the host keeps it mounted across a dashboard switch, the typed value
// survives. If it unmounts, the value resets to '' — that's the regression.
vi.mock('./TabBody', () => ({
  TabBody: ({ tab }: { tab: { id: string } }) => {
    const [value, setValue] = useState('');
    return (
      <input
        aria-label={`input-${tab.id}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  },
}));

const proj = (id: string): Project => ({
  id, name: id, path: `/p/${id}`, claudeDir: `/p/${id}/.claude`,
  hasAgents: false, hasSkills: false, hasSettings: false, agentCount: 0, skillCount: 0,
});

const initial = useWorkspaceStore.getState();
beforeEach(() => {
  useWorkspaceStore.setState(initial, true);
  useAppStore.setState({ selectedProject: null });
});

describe('DashboardSurface keep-alive', () => {
  it('keeps a backgrounded chat tab mounted so its state survives a dashboard switch', () => {
    const idA = useWorkspaceStore.getState().openDashboard(proj('a'));
    const tabA = useWorkspaceStore.getState().dashboards.find((d) => d.id === idA)!.tabs[0].id;

    const { rerender } = render(<DashboardSurface />);

    // Type into tab A's input (it is the active/visible tab).
    const inputA = screen.getByLabelText(`input-${tabA}`) as HTMLInputElement;
    fireEvent.change(inputA, { target: { value: 'hello from A' } });
    expect(inputA.value).toBe('hello from A');

    // Open a second dashboard (B) and activate it — A goes to the background.
    const idB = useWorkspaceStore.getState().openDashboard(proj('b'));
    rerender(<DashboardSurface />);
    const tabB = useWorkspaceStore.getState().dashboards.find((d) => d.id === idB)!.tabs[0].id;
    expect(screen.getByLabelText(`input-${tabB}`)).toBeInTheDocument();

    // A's input is still in the DOM (hidden, not unmounted) with its value intact.
    const backgroundedA = screen.getByLabelText(`input-${tabA}`) as HTMLInputElement;
    expect(backgroundedA).toBeInTheDocument();
    expect(backgroundedA.value).toBe('hello from A');

    // Switch back to A — same node, same value, conversation preserved.
    useWorkspaceStore.getState().setActiveDashboard(idA);
    rerender(<DashboardSurface />);
    const reactivatedA = screen.getByLabelText(`input-${tabA}`) as HTMLInputElement;
    expect(reactivatedA).toBe(backgroundedA);
    expect(reactivatedA.value).toBe('hello from A');
  });

  it('only mounts a tab once it has been activated (keep-alive on first activation)', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    // A second, never-activated dashboard's tab should not be mounted yet.
    const idB = useWorkspaceStore.getState().openDashboard(proj('b'));
    // Re-activate A so B's tab was activated once (on open) then backgrounded.
    const tabB = useWorkspaceStore.getState().dashboards.find((d) => d.id === idB)!.tabs[0].id;

    render(<DashboardSurface />);
    // B was activated when opened, so it is mounted (hidden).
    expect(screen.getByLabelText(`input-${tabB}`)).toBeInTheDocument();
  });
});
