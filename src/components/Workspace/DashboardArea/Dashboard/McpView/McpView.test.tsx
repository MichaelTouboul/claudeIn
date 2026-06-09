import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { McpServerEntry } from '@/types/mcp-mirror.types';

import { McpView } from './McpView';

function entry(name: string, overrides: Partial<McpServerEntry> = {}): McpServerEntry {
  return {
    name,
    source: 'project-mcp-json',
    scope: 'project',
    transport: 'stdio',
    target: `cmd ${name}`,
    shadowed: false,
    ...overrides,
  };
}

describe('McpView', () => {
  it('renders one row per server', () => {
    render(<McpView servers={[entry('alpha'), entry('beta', { source: 'user-settings' })]} />);
    expect(screen.getAllByTestId('mcp-server-row')).toHaveLength(2);
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('renders the empty state when there are no servers', () => {
    render(<McpView servers={[]} />);
    expect(screen.getByText('No MCP servers configured')).toBeInTheDocument();
    expect(screen.queryByTestId('mcp-server-row')).not.toBeInTheDocument();
  });
});
