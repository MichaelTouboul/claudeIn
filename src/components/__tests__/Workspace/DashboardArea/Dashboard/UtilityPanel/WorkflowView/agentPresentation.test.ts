import { describe, expect, it } from 'vitest';

import { AGENT_PRESENTATION } from '@/components/Workspace/DashboardArea/Dashboard/UtilityPanel/WorkflowView/agentPresentation';
import { AgentPresenceStatus } from '@/store/dashboard/useEventsStore';

describe('AGENT_PRESENTATION', () => {
  it('has an entry for EVERY AgentPresenceStatus value (no fallback chain)', () => {
    for (const status of Object.values(AgentPresenceStatus)) {
      const presentation = AGENT_PRESENTATION[status];
      expect(presentation, `missing presentation for "${status}"`).toBeDefined();
      expect(typeof presentation.label).toBe('string');
      expect(presentation.label.length).toBeGreaterThan(0);
      expect(typeof presentation.dot).toBe('boolean');
      expect(presentation.colorVar).toMatch(/^var\(--/);
    }
  });

  it('maps every status to a distinct design-system color var', () => {
    const colors = Object.values(AgentPresenceStatus).map((s) => AGENT_PRESENTATION[s].colorVar);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('pulses only the Active status dot', () => {
    expect(AGENT_PRESENTATION[AgentPresenceStatus.Active].dot).toBe(true);
    expect(AGENT_PRESENTATION[AgentPresenceStatus.Waiting].dot).toBe(false);
    expect(AGENT_PRESENTATION[AgentPresenceStatus.Idle].dot).toBe(false);
  });
});
