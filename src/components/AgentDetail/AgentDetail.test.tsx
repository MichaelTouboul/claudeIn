import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentFile } from '@/types/agent.types';

import { AgentDetail } from './AgentDetail';

// Isolate the fetching wrapper: stub the heavy content child and the api.
vi.mock('./AgentDetailContent/AgentDetailContent', () => ({
  AgentDetailContent: ({ agent }: { agent: AgentFile }) => <div>content:{agent.id}</div>,
}));

const { getAgent } = vi.hoisted(() => ({ getAgent: vi.fn<(name: string) => Promise<AgentFile | null>>() }));
vi.mock('@/services/api', () => ({ api: { getAgent } }));

function fullAgent(id: string): AgentFile {
  return {
    id, filePath: `/a/${id}.md`, relativePath: `${id}.md`, folder: '',
    frontmatter: { name: id, description: '' }, body: '', status: 'created',
    subAgents: [], memoryFiles: [], annexFiles: [],
  };
}

beforeEach(() => getAgent.mockReset());

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
});
