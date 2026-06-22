import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityTab } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/ActivityTab/ActivityTab';
import type { ConversationStep } from '@/lib/types';
import { ConversationStatus, useConversationStatusStore } from '@/store/dashboard/useConversationStatusStore';
import { type PanelTab, PanelTabKind } from '@/store/dashboard/usePanelStore';

const getConversationSteps =
  vi.fn<(projectPath: string, sessionId: string) => Promise<ConversationStep[]>>();
window.api = { getConversationSteps } as unknown as typeof window.api;

function activityTab(claudeSessionId: string | null, projectPath = '/proj'): PanelTab {
  return {
    id: `activity:${claudeSessionId ?? ''}`,
    kind: PanelTabKind.Activity,
    title: 'Workflow',
    payload: { claudeSessionId, projectPath },
  };
}

const STEPS: ConversationStep[] = [
  { tool: 'Read', target: 'social-trends.service.ts', ts: 't1' },
  { tool: 'Edit', target: 'social-trends.service.ts', ts: 't2' },
];

beforeEach(() => {
  getConversationSteps.mockReset();
  useConversationStatusStore.setState({ statuses: {} });
});
afterEach(() => getConversationSteps.mockReset());

describe('ActivityTab', () => {
  it('fetches steps on mount and renders a row per step', async () => {
    getConversationSteps.mockResolvedValue(STEPS);
    render(<ActivityTab tab={activityTab('sess-1')} />);
    await waitFor(() => expect(getConversationSteps).toHaveBeenCalledWith('/proj', 'sess-1'));
    expect(await screen.findByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getAllByText('social-trends.service.ts')).toHaveLength(2);
  });

  it('marks the last step current and shows Thinking when live', async () => {
    getConversationSteps.mockResolvedValue(STEPS);
    useConversationStatusStore.setState({ statuses: { 'sess-1': ConversationStatus.Running } });
    render(<ActivityTab tab={activityTab('sess-1')} />);
    expect(await screen.findByLabelText('current')).toBeInTheDocument();
    expect(screen.getByText('Thinking…')).toBeInTheDocument();
    // earlier steps are done
    expect(screen.getAllByLabelText('done')).toHaveLength(1);
  });

  it('shows the empty state when there are no steps and not live', async () => {
    getConversationSteps.mockResolvedValue([]);
    render(<ActivityTab tab={activityTab('sess-1')} />);
    expect(await screen.findByText(/no steps yet/i)).toBeInTheDocument();
  });
});
