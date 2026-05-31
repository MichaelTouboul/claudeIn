import { beforeEach, describe, expect, it } from 'vitest';

import type { AgentFile } from '@/types/agent.types';

import { useDashboardUIStore } from './useDashboardUIStore';

const initial = useDashboardUIStore.getState();
beforeEach(() => useDashboardUIStore.setState(initial, true));

const fakeAgent = { id: 'a1' } as AgentFile;

describe('useDashboardUIStore dashboard navigation', () => {
  it('defaults to the project view', () => {
    const s = useDashboardUIStore.getState();
    expect(s.view).toBe('project');
    expect(s.activeConversationId).toBeNull();
  });

  it('setActiveConversation records the conversation id', () => {
    useDashboardUIStore.getState().setActiveConversation('chat-7');
    expect(useDashboardUIStore.getState().activeConversationId).toBe('chat-7');
  });

  it('backToProject returns to the project view and clears the selected agent', () => {
    useDashboardUIStore.getState().selectAgent(fakeAgent);
    expect(useDashboardUIStore.getState().view).toBe('agent');
    useDashboardUIStore.getState().backToProject();
    const s = useDashboardUIStore.getState();
    expect(s.view).toBe('project');
    expect(s.selectedAgent).toBeNull();
  });
});
