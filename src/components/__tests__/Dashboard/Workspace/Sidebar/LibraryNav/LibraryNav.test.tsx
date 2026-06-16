import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LibraryNav } from '@/components/Dashboard/Workspace/Sidebar/LibraryNav/LibraryNav';
import { AgentScope, type AgentSummary, type HookConfig, type McpServerEntry, type SkillSummary } from '@/lib/types';
import { useDashboardStore } from '@/store/dashboard/useDashboardStore';
import { useDashboardUIStore } from '@/store/dashboard/useDashboardUIStore';
import { useEventsStore } from '@/store/dashboard/useEventsStore';
import { useFavoritesStore } from '@/store/dashboard/useFavoritesStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({ projectId: 'p1', projectName: 'p1', isUserProject: false, refresh: vi.fn() }),
}));

function agent(id: string): AgentSummary {
  return {
    id,
    scope: AgentScope.Project,
    filePath: `/a/${id}.md`,
    relativePath: `${id}.md`,
    folder: '',
    frontmatter: { name: id, description: '', color: 'cyan' },
    subAgents: [],
    shadowed: false,
    source: null,
  };
}

const skill = (name: string, description = ''): SkillSummary =>
  ({ name, description, filePath: `/s/${name}.md`, scope: 'project' } as SkillSummary);
const hook = (event: string, matcher = '*', command = 'echo'): HookConfig => ({ event, matcher, command });
const mcp = (name: string): McpServerEntry =>
  ({ name, source: 'project-mcp-json', scope: 'project', transport: 'stdio', target: 'cmd', shadowed: false });

const uiInitial = useDashboardUIStore.getState();

beforeEach(() => {
  useDashboardUIStore.setState(uiInitial, true);
  useDashboardStore.setState({
    agents: [agent('a1'), agent('a2')],
    skills: [skill('s1')],
    hooks: [hook('PreToolUse'), hook('PostToolUse'), hook('Stop')],
    mcp: [mcp('m1'), mcp('m2'), mcp('m3'), mcp('m4')],
  });
  useEventsStore.setState({
    events: [], activeAgents: new Set(), waitingAgents: new Set(),
    agentContexts: new Map(), currentTools: new Map(), presence: new Map(), presenceSeq: new Map(),
  });
  useFavoritesStore.setState({ byProject: {} });
});

describe('LibraryNav', () => {
  it('renders the hint bar and the four category rows with counts from the store', () => {
    render(<LibraryNav onAgentAction={vi.fn()} onNewAgent={vi.fn()} />);
    expect(screen.getByText(/Browse your library/i)).toBeInTheDocument();

    const agentsRow = screen.getByText('Agents').closest('button')!;
    expect(within(agentsRow).getByText('2')).toBeInTheDocument();
    const skillsRow = screen.getByText('Skills').closest('button')!;
    expect(within(skillsRow).getByText('1')).toBeInTheDocument();
    const hooksRow = screen.getByText('Hooks').closest('button')!;
    expect(within(hooksRow).getByText('3')).toBeInTheDocument();
    const mcpRow = screen.getByText('MCP servers').closest('button')!;
    expect(within(mcpRow).getByText('4')).toBeInTheDocument();
  });

  it('drills into a category (showing its list + a back bar) and returns', () => {
    render(<LibraryNav onAgentAction={vi.fn()} onNewAgent={vi.fn()} />);

    fireEvent.click(screen.getByText('MCP servers'));
    // Drilled in: store records the category, the list shows the MCP servers.
    expect(useDashboardUIStore.getState().libraryCategory).toBe('mcp');
    expect(screen.getByText('m1')).toBeInTheDocument();
    expect(screen.getByText('m4')).toBeInTheDocument();
    // The category list is gone (hint bar hidden while drilled in).
    expect(screen.queryByText(/Browse your library/i)).not.toBeInTheDocument();

    // Back bar returns to the category list.
    fireEvent.click(screen.getByText('MCP servers').closest('button')!);
    expect(useDashboardUIStore.getState().libraryCategory).toBeNull();
    expect(screen.getByText(/Browse your library/i)).toBeInTheDocument();
  });

  it('drills into Agents and renders the reused AgentsZone list', () => {
    render(<LibraryNav onAgentAction={vi.fn()} onNewAgent={vi.fn()} />);
    fireEvent.click(screen.getByText('Agents'));
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument(); // AgentsZone scope tabs
  });

  it('Skills list has a filter that narrows the rows and a scope badge', () => {
    useDashboardStore.setState({ skills: [skill('pdf-extract', 'Pull tables'), skill('changelog', 'Release notes')] });
    render(<LibraryNav onAgentAction={vi.fn()} onNewAgent={vi.fn()} />);
    fireEvent.click(screen.getByText('Skills'));

    expect(screen.getByText('pdf-extract')).toBeInTheDocument();
    expect(screen.getByText('changelog')).toBeInTheDocument();
    // Scope badge present (project skills → "project").
    expect(screen.getAllByText('project').length).toBeGreaterThan(0);

    const filter = screen.getByLabelText('Filter skills');
    fireEvent.change(filter, { target: { value: 'changelog' } });
    expect(screen.getByText('changelog')).toBeInTheDocument();
    expect(screen.queryByText('pdf-extract')).not.toBeInTheDocument();
  });

  it('Hooks list has a filter that narrows the rows', () => {
    useDashboardStore.setState({
      hooks: [hook('PreToolUse', 'Bash', 'guard.sh'), hook('PostToolUse', 'Edit', 'lint.sh')],
    });
    render(<LibraryNav onAgentAction={vi.fn()} onNewAgent={vi.fn()} />);
    fireEvent.click(screen.getByText('Hooks'));

    expect(screen.getByText('PreToolUse')).toBeInTheDocument();
    expect(screen.getByText('PostToolUse')).toBeInTheDocument();

    const filter = screen.getByLabelText('Filter hooks');
    fireEvent.change(filter, { target: { value: 'PostToolUse' } });
    expect(screen.getByText('PostToolUse')).toBeInTheDocument();
    expect(screen.queryByText('PreToolUse')).not.toBeInTheDocument();
  });

  it('MCP list has a filter that narrows the rows and a scope badge', () => {
    render(<LibraryNav onAgentAction={vi.fn()} onNewAgent={vi.fn()} />);
    fireEvent.click(screen.getByText('MCP servers'));

    expect(screen.getByText('m1')).toBeInTheDocument();
    expect(screen.getByText('m4')).toBeInTheDocument();
    expect(screen.getAllByText('project').length).toBeGreaterThan(0);

    const filter = screen.getByLabelText('Filter servers');
    fireEvent.change(filter, { target: { value: 'm4' } });
    expect(screen.getByText('m4')).toBeInTheDocument();
    expect(screen.queryByText('m1')).not.toBeInTheDocument();
  });

  it('opening a skill row routes to a center tab via addTab', () => {
    useDashboardStore.setState({ skills: [skill('pdf-extract', 'Pull tables')] });
    const addTab = vi.spyOn(useWorkspaceStore.getState(), 'addTab');
    render(<LibraryNav onAgentAction={vi.fn()} onNewAgent={vi.fn()} />);
    fireEvent.click(screen.getByText('Skills'));
    fireEvent.click(screen.getByText('pdf-extract'));
    expect(addTab).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'skill', title: 'pdf-extract', skillId: '/s/pdf-extract.md' }),
    );
    addTab.mockRestore();
  });

  it('a skill row More menu opens its favorites action', async () => {
    useDashboardStore.setState({ skills: [skill('pdf-extract', 'Pull tables')] });
    render(<LibraryNav onAgentAction={vi.fn()} onNewAgent={vi.fn()} />);
    fireEvent.click(screen.getByText('Skills'));
    // Radix DropdownMenu uses pointer capture (absent in jsdom) — open via the
    // keyboard path: focus the trigger and press Enter.
    const trigger = screen.getByLabelText('More actions');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(await screen.findByText('Add to favorites')).toBeInTheDocument();
  });
});
