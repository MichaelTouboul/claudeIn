import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { McpNavItem } from './McpNavItem';

const realAddTab = useWorkspaceStore.getState().addTab;

afterEach(() => {
  useWorkspaceStore.setState({ addTab: realAddTab });
  vi.restoreAllMocks();
});

describe('McpNavItem', () => {
  it('renders an entry with an accessible name', () => {
    const { getByRole } = render(<McpNavItem />);
    expect(getByRole('button', { name: 'MCP Servers' })).not.toBeNull();
  });

  it('opens/focuses the MCP tab via the shared addTab action when activated', () => {
    const addTab = vi.fn<typeof realAddTab>(() => 'tab-1');
    useWorkspaceStore.setState({ addTab });

    const { getByRole } = render(<McpNavItem />);
    fireEvent.click(getByRole('button', { name: 'MCP Servers' }));

    expect(addTab).toHaveBeenCalledTimes(1);
    expect(addTab).toHaveBeenCalledWith({ kind: 'mcp', title: 'MCP Servers' });
  });
});
