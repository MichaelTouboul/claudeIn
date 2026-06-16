import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentDetailContent } from '@/components/Dashboard/AgentDetail/AgentDetailContent/AgentDetailContent';
import type { AgentFile } from '@/lib/types';

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({ projectId: 'p1', projectName: 'p1', isUserProject: false, refresh: vi.fn() }),
}));

const { backToProject } = vi.hoisted(() => ({ backToProject: vi.fn() }));
vi.mock('@/store/dashboard/useDashboardUIStore', () => ({
  useDashboardUIStore: (sel: (s: { backToProject: () => void }) => unknown) => sel({ backToProject }),
}));

const { addTab } = vi.hoisted(() => ({ addTab: vi.fn() }));
vi.mock('@/store/useWorkspaceStore', () => ({
  useWorkspaceStore: (sel: (s: { addTab: () => void }) => unknown) => sel({ addTab }),
}));

vi.mock('@/store/dashboard/useFavoritesStore', () => ({
  useFavoritesStore: Object.assign(
    (sel: (s: { byProject: Record<string, unknown[]> }) => unknown) => sel({ byProject: {} }),
    { getState: () => ({ toggle: vi.fn() }) },
  ),
}));

// MemoryManager pulls in heavy project plumbing; stub it for these tests.
vi.mock('@/components/Dashboard/AgentDetail/MemoryManager/MemoryManager', () => ({
  MemoryManager: () => <div data-testid="memory-manager" />,
}));

const { updateAgent } = vi.hoisted(() => ({
  updateAgent: vi.fn<(name: string, payload: unknown) => Promise<AgentFile>>(),
}));
vi.mock('@/services/api', () => ({ api: { updateAgent, getAgent: vi.fn() } }));

function fullAgent(over: Partial<AgentFile> = {}): AgentFile {
  return {
    id: 'a11y-runner',
    filePath: '/perso/.claude/agents/a11y-runner.md',
    relativePath: 'a11y-runner.md',
    folder: '',
    frontmatter: {
      name: 'a11y-runner',
      description: 'Runs the accessibility audit skill.',
      tools: ['Read', 'Grep', 'Glob', 'Bash'],
      skills: ['accessibility-audit'],
      maxTurns: 30,
      background: true,
      model: '',
      permissionMode: '',
      memory: '',
      isolation: '',
    },
    body: '# Accessibility audit runner\n\nYou run the audit skill.',
    status: 'created',
    subAgents: [],
    memoryFiles: [],
    annexFiles: [],
    scope: 'project',
    ...over,
  };
}

beforeEach(() => {
  updateAgent.mockReset();
  addTab.mockReset();
  backToProject.mockReset();
});

describe('AgentDetailContent — single-page agent config', () => {
  it('renders identity: name, scope badge, and the file path', () => {
    render(<AgentDetailContent agent={fullAgent()} onDelete={() => {}} />);
    expect(screen.getByText('a11y-runner')).toBeInTheDocument();
    expect(screen.getByText('project')).toBeInTheDocument();
    expect(screen.getByText('/perso/.claude/agents/a11y-runner.md')).toBeInTheDocument();
  });

  it('renders the description and the system prompt body', () => {
    render(<AgentDetailContent agent={fullAgent()} onDelete={() => {}} />);
    expect(screen.getByText('Runs the accessibility audit skill.')).toBeInTheDocument();
    expect(screen.getByText(/Accessibility audit runner/)).toBeInTheDocument();
  });

  it('renders configuration rows with values, and "Inherited" when a field is null/empty', () => {
    render(<AgentDetailContent agent={fullAgent()} onDelete={() => {}} />);
    // Wired values
    expect(screen.getByText('Max turns')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    // Empty fields → Inherited
    expect(screen.getAllByText('Inherited').length).toBeGreaterThan(0);
  });

  it('renders tools as chips and skills as badges', () => {
    render(<AgentDetailContent agent={fullAgent()} onDelete={() => {}} />);
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Bash')).toBeInTheDocument();
    expect(screen.getByText('accessibility-audit')).toBeInTheDocument();
  });

  it('exposes a More menu with Duplicate, Reveal in Finder and Delete', async () => {
    render(<AgentDetailContent agent={fullAgent()} onDelete={() => {}} />);
    // Radix DropdownMenu uses pointer capture (absent in jsdom) — open via keyboard.
    const trigger = screen.getByLabelText('More actions');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Reveal in Finder')).toBeInTheDocument();
  });

  it('Run opens a chat tab for the agent', () => {
    render(<AgentDetailContent agent={fullAgent()} onDelete={() => {}} />);
    fireEvent.click(screen.getByText('Run'));
    expect(addTab).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'chat', agentName: 'a11y-runner' }),
    );
  });

  it('Edit toggles inline fields; Save persists edits via updateAgent then calls onAgentUpdated', async () => {
    const updated = fullAgent({ frontmatter: { name: 'a11y-runner', description: 'changed' } });
    updateAgent.mockResolvedValue(updated);
    const onAgentUpdated = vi.fn();

    render(<AgentDetailContent agent={fullAgent()} onDelete={() => {}} onAgentUpdated={onAgentUpdated} />);

    fireEvent.click(screen.getByText('Edit'));
    // An editable description field appears (the prose <p> is gone).
    const descInput = screen.getByLabelText('Description');
    fireEvent.change(descInput, { target: { value: 'changed' } });

    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(updateAgent).toHaveBeenCalled());
    const [, payload] = updateAgent.mock.calls[0];
    expect(payload).toMatchObject({ frontmatter: { description: 'changed' } });
    await waitFor(() => expect(onAgentUpdated).toHaveBeenCalledWith(updated));
  });

  it('Save persists an edited system-prompt body through the body write path', async () => {
    updateAgent.mockResolvedValue(fullAgent());
    render(<AgentDetailContent agent={fullAgent()} onDelete={() => {}} />);

    fireEvent.click(screen.getByText('Edit'));
    const promptArea = screen.getByLabelText('System prompt');
    fireEvent.change(promptArea, { target: { value: '# New body' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(updateAgent).toHaveBeenCalled());
    const [, payload] = updateAgent.mock.calls[0];
    expect(payload).toMatchObject({ body: '# New body' });
  });

  it('Cancel exits edit mode without writing', () => {
    render(<AgentDetailContent agent={fullAgent()} onDelete={() => {}} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByText('Save')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(updateAgent).not.toHaveBeenCalled();
  });

  it('breadcrumb back affordance calls backToProject', () => {
    render(<AgentDetailContent agent={fullAgent()} onDelete={() => {}} />);
    fireEvent.click(screen.getByText('Library'));
    expect(backToProject).toHaveBeenCalled();
  });
});
