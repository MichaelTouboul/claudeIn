import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { McpServerEntry } from '@/types/mcp-mirror.types';

import { McpServerRow } from './McpServerRow';

function entry(overrides: Partial<McpServerEntry> = {}): McpServerEntry {
  return {
    name: 'context7',
    source: 'project-mcp-json',
    scope: 'project',
    transport: 'stdio',
    target: 'npx -y @context7/mcp',
    shadowed: false,
    ...overrides,
  };
}

describe('McpServerRow', () => {
  it('renders the server name, badges and target', () => {
    render(<McpServerRow server={entry()} />);
    expect(screen.getByText('context7')).toBeInTheDocument();
    expect(screen.getByText('stdio')).toBeInTheDocument();
    expect(screen.getByText('Project .mcp.json')).toBeInTheDocument();
    expect(screen.getByText('npx -y @context7/mcp')).toBeInTheDocument();
  });

  it('renders the target in a monospace font', () => {
    render(<McpServerRow server={entry({ target: 'node srv.js' })} />);
    const target = screen.getByText('node srv.js');
    expect(target).toHaveStyle({ fontFamily: 'var(--font-mono)' });
  });

  it('does not mark or dim a non-shadowed row', () => {
    render(<McpServerRow server={entry({ shadowed: false })} />);
    expect(screen.queryByText('shadowed')).not.toBeInTheDocument();
    expect(screen.getByTestId('mcp-server-row')).toHaveAttribute('data-shadowed', 'false');
  });

  it('dims and tags a shadowed row', () => {
    render(<McpServerRow server={entry({ shadowed: true })} />);
    expect(screen.getByText('shadowed')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-server-row')).toHaveAttribute('data-shadowed', 'true');
  });
});
