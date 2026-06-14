import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TabBody } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/DashboardSurface/TabBody';
import type { AgentSummary } from '@/lib/types';
import { useDashboardStore } from '@/store/dashboard/useDashboardStore';
import type { InternalTab } from '@/store/useWorkspaceStore';

// The chat/agent/skill/session bodies are heavy (IPC, child processes). This
// suite only exercises the kind→component routing, so stub them out.
vi.mock('@/components/Dashboard/Workspace/DashboardArea/Dashboard/ChatTab/ChatTab', () => ({ ChatTab: () => <div data-testid="chat-tab" /> }));
vi.mock('@/components/Dashboard/Workspace/DashboardArea/Dashboard/SessionViewer/SessionViewer', () => ({ SessionViewer: () => <div data-testid="session-viewer" /> }));
vi.mock('@/components/Dashboard/Workspace/DashboardArea/Dashboard/SkillDetail/SkillDetail', () => ({ SkillDetail: () => <div data-testid="skill-detail" /> }));
vi.mock('@/components/Dashboard/AgentDetail/AgentDetail', () => ({ AgentDetail: () => <div data-testid="agent-detail" /> }));

const agentTab: InternalTab = { id: 'tab-agent', kind: 'agent', title: 'alpha', agentName: 'alpha' };

const agent = (id: string): AgentSummary =>
  ({ id, scope: 'project' }) as unknown as AgentSummary;

const initial = useDashboardStore.getState();
beforeEach(() => {
  useDashboardStore.setState(initial, true);
});

describe('TabBody routing', () => {
  it('renders the chat tab for a kind:"chat" tab', () => {
    render(<TabBody tab={{ id: 't', kind: 'chat', title: 'Chat' }} cwd="/p/a" />);
    expect(screen.getByTestId('chat-tab')).toBeInTheDocument();
  });

  it('renders AgentDetail for a known agent tab', () => {
    useDashboardStore.setState({ agents: [agent('alpha')] });
    render(<TabBody tab={agentTab} cwd="/p/a" />);
    expect(screen.getByTestId('agent-detail')).toBeInTheDocument();
  });

  it('renders a not-found body for an unknown agent tab', () => {
    useDashboardStore.setState({ agents: [] });
    render(<TabBody tab={agentTab} cwd="/p/a" />);
    expect(screen.getByText(/agent not found/i)).toBeInTheDocument();
  });
});
