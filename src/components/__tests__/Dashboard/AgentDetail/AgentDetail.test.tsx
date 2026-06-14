import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentDetail } from '@/components/Dashboard/AgentDetail/AgentDetail';
import type { AgentFile } from '@/lib/types';

// Isolate the fetching wrapper: stub the heavy content child and the api.
vi.mock('@/components/Dashboard/AgentDetail/AgentDetailContent/AgentDetailContent', () => ({
  AgentDetailContent: ({ agent }: { agent: AgentFile }) => <div>content:{agent.id}</div>,
}));

const { getAgent, getAgentByPath } = vi.hoisted(() => ({
  getAgent: vi.fn<(name: string) => Promise<AgentFile | null>>(),
  getAgentByPath: vi.fn<(filePath: string) => Promise<AgentFile | null>>(),
}));
vi.mock('@/services/api', () => ({ api: { getAgent, getAgentByPath } }));

function fullAgent(id: string): AgentFile {
  return {
    id, filePath: `/a/${id}.md`, relativePath: `${id}.md`, folder: '',
    frontmatter: { name: id, description: '' }, body: '', status: 'created',
    subAgents: [], memoryFiles: [], annexFiles: [],
  };
}

beforeEach(() => {
  getAgent.mockReset();
  getAgentByPath.mockReset();
});

describe('AgentDetail on-demand fetch', () => {
  it('shows a loading state, then the content once loaded', async () => {
    let resolve!: (a: AgentFile | null) => void;
    getAgent.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<AgentDetail agentId="a1" onDelete={() => {}} />);
    expect(screen.getByText('Loading agent…')).toBeInTheDocument();

    resolve(fullAgent('a1'));
    await waitFor(() => expect(screen.getByText('content:a1')).toBeInTheDocument());
    expect(getAgent).toHaveBeenCalledWith('a1');
  });

  it('shows a not-found state when the fetch returns null', async () => {
    getAgent.mockResolvedValue(null);
    render(<AgentDetail agentId="ghost" onDelete={() => {}} />);
    await waitFor(() => expect(screen.getByText('Agent not found.')).toBeInTheDocument());
  });

  it('re-fetches when agentId changes', async () => {
    getAgent.mockImplementation((name) => Promise.resolve(fullAgent(name)));
    const { rerender } = render(<AgentDetail agentId="a1" onDelete={() => {}} />);
    await waitFor(() => expect(screen.getByText('content:a1')).toBeInTheDocument());

    rerender(<AgentDetail agentId="a2" onDelete={() => {}} />);
    await waitFor(() => expect(screen.getByText('content:a2')).toBeInTheDocument());
    expect(getAgent).toHaveBeenCalledTimes(2);
  });

  it('resolves a PROJECT-scope agent by filePath, not the user-only id lookup', async () => {
    // Regression: a project agent (sidebar mirror) has a filePath outside
    // ~/.claude/agents. The id-only getAgent would return null → "Agent not
    // found"; getAgentByPath is scope-agnostic and must be used instead.
    getAgentByPath.mockResolvedValue(fullAgent('tw-repo'));

    render(
      <AgentDetail agentId="tw-repo" filePath="/proj/.claude/agents/tw-repo.md" onDelete={() => {}} />,
    );

    await waitFor(() => expect(screen.getByText('content:tw-repo')).toBeInTheDocument());
    expect(getAgentByPath).toHaveBeenCalledWith('/proj/.claude/agents/tw-repo.md');
    expect(getAgent).not.toHaveBeenCalled();
  });
});
