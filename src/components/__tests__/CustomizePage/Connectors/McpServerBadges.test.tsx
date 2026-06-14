import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { McpServerBadges } from '@/components/CustomizePage/Connectors/McpServerBadges';
import type { McpServerEntry } from '@/types/mcp-mirror.types';

function entry(overrides: Partial<McpServerEntry> = {}): McpServerEntry {
  return {
    name: 'srv',
    source: 'project-mcp-json',
    scope: 'project',
    transport: 'stdio',
    target: 'node server.js',
    shadowed: false,
    ...overrides,
  };
}

describe('McpServerBadges', () => {
  it('renders the transport label from TRANSPORT_PRESENTATION', () => {
    render(<McpServerBadges server={entry({ transport: 'http' })} />);
    expect(screen.getByText('http')).toBeInTheDocument();
  });

  it('renders the source label from SOURCE_PRESENTATION', () => {
    render(<McpServerBadges server={entry({ source: 'user-settings' })} />);
    expect(screen.getByText('User settings')).toBeInTheDocument();
  });

  it('renders the explicit unknown transport label (no fallback chain)', () => {
    render(<McpServerBadges server={entry({ transport: 'unknown' })} />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });
});
