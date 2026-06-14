import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LauncherView } from '@/components/Workspace/DashboardArea/Dashboard/LauncherView/LauncherView';
import { useAppStore } from '@/store/useAppStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { AgentFile } from '@/types/agent.types';
import type { Project } from '@/types/dashboard.types';

const proj = (id: string): Project => ({
  id, name: id, path: `/p/${id}`, claudeDir: `/p/${id}/.claude`,
  hasAgents: false, hasSkills: false, hasSettings: false, agentCount: 0, skillCount: 0,
});

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({ projects: [proj('alpha'), proj('beta')], loading: false }),
}));

const agent = (id: string): AgentFile => ({
  id, filePath: `/a/${id}.md`, relativePath: `${id}.md`, folder: '',
  frontmatter: { name: id, description: '' }, body: '', status: 'created',
  subAgents: [], memoryFiles: [], annexFiles: [],
});

vi.mock('@/services/api', () => ({
  api: { getAgents: () => Promise.resolve([agent('tw-dev'), agent('researcher')]) },
}));

const initial = useWorkspaceStore.getState();
beforeEach(() => {
  useWorkspaceStore.setState(initial, true);
  useAppStore.setState({ selectedProject: null });
  useWorkspaceStore.getState().setHomeDir('/home/me');
});

function openLauncherDashboard(): string {
  return useWorkspaceStore.getState().openLauncher();
}

describe('LauncherView', () => {
  it('Open a project card expands a list and resolves to a project dashboard', () => {
    const id = openLauncherDashboard();
    render(<LauncherView dashboardId={id} />);

    fireEvent.click(screen.getByRole('button', { name: /Open a project/i }));
    fireEvent.click(screen.getByRole('button', { name: /alpha/i }));

    const d = useWorkspaceStore.getState().dashboards.find((x) => x.id === id)!;
    expect(d.scope.kind).toBe('project');
    expect(d.cwd).toBe('/p/alpha');
  });

  it('New discussion card resolves immediately to a user-scope chat', () => {
    const id = openLauncherDashboard();
    render(<LauncherView dashboardId={id} />);

    fireEvent.click(screen.getByRole('button', { name: /New discussion/i }));

    const d = useWorkspaceStore.getState().dashboards.find((x) => x.id === id)!;
    expect(d.scope.kind).toBe('user');
    expect(d.cwd).toBe('/home/me');
    expect(d.tabs[0].agentName).toBe('');
  });

  it('User-scope agent card expands a searchable list that filters and resolves', async () => {
    const id = openLauncherDashboard();
    render(<LauncherView dashboardId={id} />);

    fireEvent.click(screen.getByRole('button', { name: /User-scope agent/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /tw-dev/i })).toBeInTheDocument());

    // Filter narrows the list.
    fireEvent.change(screen.getByLabelText('Search agents'), { target: { value: 'research' } });
    expect(screen.queryByRole('button', { name: /tw-dev/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /researcher/i }));
    const d = useWorkspaceStore.getState().dashboards.find((x) => x.id === id)!;
    expect(d.scope.kind).toBe('user');
    expect(d.tabs[0].agentName).toBe('researcher');
  });
});
