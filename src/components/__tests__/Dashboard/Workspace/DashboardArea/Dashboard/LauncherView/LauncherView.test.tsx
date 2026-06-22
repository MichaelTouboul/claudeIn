import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LauncherView } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/LauncherView/LauncherView';
import type { AgentFile, Project  } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

const proj = (id: string): Project => ({
  id, name: id, path: `/p/${id}`, claudeDir: `/p/${id}/.claude`,
  hasAgents: false, hasSkills: false, hasSettings: false, agentCount: 0, skillCount: 0,
});

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({ projects: [proj('alpha'), proj('beta')], loading: false }),
}));

// ProjectList now lists the user's favorite repos (not all scanned projects).
// 'alpha' is both a favorite and a scanned project, so it resolves to /p/alpha.
// Its `label` is an LLM description distinct from the folder name ('alpha'),
// so the row title must show the basename, not the description.
const FAVORITE_DESCRIPTION = 'Alpha is a Nx monorepo for the alpha service';
// 'alpha' has no logo (→ falls back to the hued folder chip); 'gamma' carries a
// `logoDataUrl` (→ renders the logo image in place of the chip).
const GAMMA_LOGO = 'data:image/png;base64,iVBORw0KGgo=';
vi.mock('@/hooks/useFavoriteRepos', () => ({
  useFavoriteRepos: () => ({
    repos: [
      { path: '/p/alpha', label: 'Alpha is a Nx monorepo for the alpha service', addedAt: '2026-01-01T00:00:00Z' },
      { path: '/p/gamma', label: null, addedAt: '2026-01-02T00:00:00Z', logoDataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
    ],
    loading: false,
    refresh: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  }),
}));

const agent = (id: string): AgentFile => ({
  id, filePath: `/a/${id}.md`, relativePath: `${id}.md`, folder: '',
  frontmatter: { name: id, description: '' }, body: '', status: 'created',
  subAgents: [], memoryFiles: [], annexFiles: [],
});

vi.mock('@/services/api', () => ({
  api: { getAgents: () => Promise.resolve([agent('tw-dev'), agent('researcher')]) },
}));

// The new "Active worktrees · all repos" section reads the all-repos aggregation;
// stub the two window.api methods it touches (no active worktrees here).
window.api = {
  gitWorktreesAllRepos: () => Promise.resolve([]),
  onEvent: () => () => {},
} as unknown as typeof window.api;

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
  it('Open a project dropdown lists repos and resolves to a project dashboard', () => {
    const id = openLauncherDashboard();
    render(<LauncherView dashboardId={id} />);

    // The "Open a project" dropdown is expanded by default (matches the design).
    fireEvent.click(screen.getByRole('button', { name: /alpha/i }));

    const d = useWorkspaceStore.getState().dashboards.find((x) => x.id === id)!;
    expect(d.scope.kind).toBe('project');
    expect(d.cwd).toBe('/p/alpha');
  });

  it('Project row shows the repo name (basename) + path, not the LLM description', () => {
    const id = openLauncherDashboard();
    render(<LauncherView dashboardId={id} />);

    // The folder name is shown as the title and the path in mono…
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('/p/alpha')).toBeInTheDocument();
    // …and the LLM description is never rendered.
    expect(screen.queryByText(FAVORITE_DESCRIPTION)).toBeNull();
  });

  it('renders the repo logo when one exists, else falls back to the folder chip', () => {
    const id = openLauncherDashboard();
    render(<LauncherView dashboardId={id} />);

    // 'gamma' has a logoDataUrl → its row shows the logo image (alt = repo name).
    const logo = screen.getByRole('img', { name: 'gamma' });
    expect(logo).toHaveAttribute('src', GAMMA_LOGO);

    // 'alpha' has no logo → no image for it (the hued folder chip is an SVG icon,
    // not an <img>), so 'gamma' is the ONLY repo image rendered.
    expect(screen.queryByRole('img', { name: 'alpha' })).toBeNull();
    expect(screen.getAllByRole('img')).toHaveLength(1);
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
