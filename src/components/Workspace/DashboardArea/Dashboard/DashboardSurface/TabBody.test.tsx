import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDashboardStore } from '@/store/useDashboardStore';
import type { InternalTab } from '@/store/useWorkspaceStore';
import type { McpServerEntry } from '@/types/mcp-mirror.types';

import { TabBody } from './TabBody';

// The chat/agent/skill/session bodies are heavy (IPC, child processes). This
// suite only exercises the kind→component routing, so stub them out.
vi.mock('../ChatTab/ChatTab', () => ({ ChatTab: () => <div data-testid="chat-tab" /> }));
vi.mock('../SessionViewer/SessionViewer', () => ({ SessionViewer: () => <div data-testid="session-viewer" /> }));
vi.mock('../SkillDetail/SkillDetail', () => ({ SkillDetail: () => <div data-testid="skill-detail" /> }));
vi.mock('@/components/AgentDetail/AgentDetail', () => ({ AgentDetail: () => <div data-testid="agent-detail" /> }));

const mcpTab: InternalTab = { id: 'tab-mcp', kind: 'mcp', title: 'MCP Servers' };

const server = (name: string): McpServerEntry => ({
  name, source: 'project-mcp-json', scope: 'project', transport: 'stdio', target: 'cmd', shadowed: false,
});

const initial = useDashboardStore.getState();
beforeEach(() => {
  useDashboardStore.setState(initial, true);
});

describe('TabBody mcp routing', () => {
  it('renders McpView for a kind:"mcp" tab, fed from the dashboard store mcp slice', () => {
    useDashboardStore.setState({ mcp: [server('alpha'), server('beta')] });
    render(<TabBody tab={mcpTab} cwd="/p/a" />);
    const view = screen.getByTestId('mcp-view');
    expect(view).toBeInTheDocument();
    expect(view).toHaveTextContent('alpha');
    expect(view).toHaveTextContent('beta');
  });

  it('renders the McpView empty state when no servers are configured', () => {
    useDashboardStore.setState({ mcp: [] });
    render(<TabBody tab={mcpTab} cwd="/p/a" />);
    expect(screen.getByTestId('mcp-view')).toHaveTextContent('No MCP servers configured');
  });
});
