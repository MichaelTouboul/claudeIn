import { render, waitFor } from '@testing-library/react';
import { useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SpawnSession } from '@/types/spawn.types';

import { AgentChat } from './AgentChat';
import type { RichEditorHandle } from './RichEditor/RichEditor';

// The bug: after a turn completes the input must auto-focus so the user can
// reply without clicking. The previous fix bound focus to `waitingInput`, which
// is driven by `spawn_input_request` — an event the one-shot `claude --print`
// backend never emits. AgentChat now focuses on `spawn_exit` (turn complete).

const focusSpy = vi.fn();

// Mock RichEditor: forward the focus() spy through the imperative handle so a
// real editorRef.current.focus() call is observable, without pulling in Lexical.
vi.mock('./RichEditor/RichEditor', () => ({
  RichEditor: ({ handleRef }: { handleRef: React.Ref<RichEditorHandle> }) => {
    useImperativeHandle(handleRef, () => ({
      focus: focusSpy,
      clear: vi.fn(),
      insertMention: vi.fn(),
    }));
    return <div data-testid="rich-editor" />;
  },
}));

// Trim other heavy/irrelevant leaves.
vi.mock('./AgentChatHeader/AgentChatHeader', () => ({ AgentChatHeader: () => <div /> }));
vi.mock('./AgentChatMessages/AgentChatMessages', () => ({ AgentChatMessages: () => <div /> }));

let eventCb: ((data: unknown) => void) | null = null;
const spawnMock = vi.fn();

const session: SpawnSession = {
  id: 'sess-1',
  agentName: 'tester',
  mission: 'hi',
  status: 'running',
  pid: 1,
  startedAt: new Date().toISOString(),
  messages: [],
  claudeSessionId: 'claude-1',
};

beforeEach(() => {
  focusSpy.mockClear();
  eventCb = null;
  spawnMock.mockReset().mockResolvedValue(session);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  vi.stubGlobal('window', window);
  window.api = {
    onEvent: (cb: (data: unknown) => void) => {
      eventCb = cb;
      return () => { eventCb = null; };
    },
    spawn: spawnMock,
  } as unknown as typeof window.api;
});

describe('AgentChat focus-on-turn-complete', () => {
  it('focuses the input when the turn finishes (spawn_exit)', async () => {
    // Auto-send path establishes a session whose id matches our spawn_exit event.
    render(
      <AgentChat agentName="tester" cwd="/p" resumeSessionId="claude-1" initialMessage="hi" />
    );

    // Wait until the spawn resolved and the session ref is populated.
    await waitFor(() => expect(spawnMock).toHaveBeenCalled());
    await waitFor(() => expect(eventCb).not.toBeNull());

    focusSpy.mockClear();

    // The agent finishes its turn: the one-shot process exits.
    eventCb!({ type: 'spawn_exit', sessionId: 'sess-1', status: 'done', claudeSessionId: 'claude-1' });

    // focusInputOnTurnComplete defers focus to the next tick (setTimeout 0).
    await waitFor(() => expect(focusSpy).toHaveBeenCalled());
  });

  it('does not steal focus when the window is hidden', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    render(
      <AgentChat agentName="tester" cwd="/p" resumeSessionId="claude-1" initialMessage="hi" />
    );

    await waitFor(() => expect(eventCb).not.toBeNull());
    focusSpy.mockClear();

    eventCb!({ type: 'spawn_exit', sessionId: 'sess-1', status: 'done' });

    // Give the deferred focus a chance to (not) fire.
    await new Promise((r) => setTimeout(r, 10));
    expect(focusSpy).not.toHaveBeenCalled();
  });
});
