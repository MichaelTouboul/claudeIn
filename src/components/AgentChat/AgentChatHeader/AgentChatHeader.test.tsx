import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useEventsStore } from '@/store/useEventsStore';
import type { AgentContext } from '@/types/events.types';

import { AgentChatHeader } from './AgentChatHeader';

const ctx = (over: Partial<AgentContext> = {}): AgentContext => ({
  tokensIn: 1000, tokensOut: 500, costUsd: 0.0123, percent: 42, ...over,
});

beforeEach(() => {
  useEventsStore.setState({ agentContexts: new Map() });
});
afterEach(() => {
  useEventsStore.setState({ agentContexts: new Map() });
});

// The Radix progress bar renders with role="progressbar".
function bar(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[role="progressbar"]');
}

describe('AgentChatHeader context bar', () => {
  it('renders the context bar when the agent has live context data', () => {
    useEventsStore.setState({ agentContexts: new Map([['tw-dev', ctx()]]) });
    const { container } = render(
      <AgentChatHeader agentName="tw-dev" session={null} isRunning={false} waitingInput={false} onKill={() => {}} />,
    );
    expect(bar(container)).not.toBeNull();
  });

  it('renders nothing for the bar when there is no context for the agent', () => {
    const { container } = render(
      <AgentChatHeader agentName="tw-dev" session={null} isRunning={false} waitingInput={false} onKill={() => {}} />,
    );
    expect(bar(container)).toBeNull();
  });

  it('renders nothing for the bar when context percent is 0', () => {
    useEventsStore.setState({ agentContexts: new Map([['tw-dev', ctx({ percent: 0 })]]) });
    const { container } = render(
      <AgentChatHeader agentName="tw-dev" session={null} isRunning={false} waitingInput={false} onKill={() => {}} />,
    );
    expect(bar(container)).toBeNull();
  });
});
