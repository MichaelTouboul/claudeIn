import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LibraryNav } from '@/components/Dashboard/Workspace/Sidebar/LibraryNav/LibraryNav';
import { AgentScope, type AgentSummary, type HookConfig, type McpServerEntry, type SkillSummary } from '@/lib/types';
import { useDashboardStore } from '@/store/dashboard/useDashboardStore';
import { useDashboardUIStore } from '@/store/dashboard/useDashboardUIStore';
import { useEventsStore } from '@/store/dashboard/useEventsStore';
import { useFavoritesStore } from '@/store/dashboard/useFavoritesStore';

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

const skill = (name: string): SkillSummary =>
  ({ name, filePath: `/s/${name}.md`, scope: 'project' } as SkillSummary);
const hook = (event: string): HookConfig => ({ event, matcher: '*', command: 'echo' } as HookConfig);
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
});
