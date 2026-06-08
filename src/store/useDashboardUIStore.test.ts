import { beforeEach, describe, expect, it } from 'vitest';

import type { AgentSummary } from '@/types/agents-mirror.types';

import { useDashboardUIStore } from './useDashboardUIStore';

const initial = useDashboardUIStore.getState();
beforeEach(() => useDashboardUIStore.setState(initial, true));

const fakeAgent = { id: 'a1' } as AgentSummary;

describe('useDashboardUIStore dashboard navigation', () => {
  it('defaults to no selected agent', () => {
    const s = useDashboardUIStore.getState();
    expect(s.selectedAgent).toBeNull();
  });

  it('selectAgent records the agent and clears any selected skill', () => {
    useDashboardUIStore.getState().selectAgent(fakeAgent);
    const s = useDashboardUIStore.getState();
    expect(s.selectedAgent).toBe(fakeAgent);
    expect(s.selectedSkill).toBeNull();
  });

  it('backToProject clears the selected agent', () => {
    useDashboardUIStore.getState().selectAgent(fakeAgent);
    expect(useDashboardUIStore.getState().selectedAgent).toBe(fakeAgent);
    useDashboardUIStore.getState().backToProject();
    expect(useDashboardUIStore.getState().selectedAgent).toBeNull();
  });

  it('openPanel reveals a panel (idempotently, never closing an open one)', () => {
    const { openPanel } = useDashboardUIStore.getState();
    openPanel('agents');
    expect(useDashboardUIStore.getState().openPanels.has('agents')).toBe(true);
    // Calling again keeps it open (vs togglePanel, which would close it).
    openPanel('agents');
    expect(useDashboardUIStore.getState().openPanels.has('agents')).toBe(true);
  });
});
