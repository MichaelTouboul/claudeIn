import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AgentChatHeader } from '@/components/Dashboard/AgentChat/AgentChatHeader/AgentChatHeader';
import { AgentPresenceStatus, useEventsStore } from '@/store/dashboard/useEventsStore';

function reset() {
  useEventsStore.setState({
    agentContexts: new Map(),
    sessionContexts: new Map(),
    presence: new Map(),
  });
}

// Mark `agentName` present in `sessionId` so the agent-derived percent resolves.
function present(sessionId: string, agentName: string) {
  return new Map([[sessionId, new Map([[agentName, AgentPresenceStatus.Active]])]]);
}

beforeEach(reset);
afterEach(reset);

// The Radix progress bar renders with role="progressbar".
function bar(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[role="progressbar"]');
}

describe('AgentChatHeader context bar', () => {
  it('renders the context bar from the backend percent for the agent session', () => {
    useEventsStore.setState({
      presence: present('sess-1', 'tw-dev'),
      sessionContexts: new Map([['sess-1', 42]]),
    });
    const { container } = render(
      <AgentChatHeader agentName="tw-dev" session={null} isRunning={false} waitingInput={false} onKill={() => {}} />,
    );
    expect(bar(container)).not.toBeNull();
  });

  it('renders nothing for the bar when there is no backend percent for the agent', () => {
    const { container } = render(
      <AgentChatHeader agentName="tw-dev" session={null} isRunning={false} waitingInput={false} onKill={() => {}} />,
    );
    expect(bar(container)).toBeNull();
  });

  it('renders nothing for the bar when the backend percent is 0', () => {
    useEventsStore.setState({
      presence: present('sess-1', 'tw-dev'),
      sessionContexts: new Map([['sess-1', 0]]),
    });
    const { container } = render(
      <AgentChatHeader agentName="tw-dev" session={null} isRunning={false} waitingInput={false} onKill={() => {}} />,
    );
    expect(bar(container)).toBeNull();
  });
});
