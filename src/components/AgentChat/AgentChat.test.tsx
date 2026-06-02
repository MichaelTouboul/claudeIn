import { render, waitFor } from '@testing-library/react';
import { useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SpawnSession } from '@/types/spawn.types';

import { AgentChat } from './AgentChat';
import type { RichEditorHandle } from './RichEditor/RichEditor';

// Focus is now driven by the structured `cam-ask` prompt in the last agent
// message (the deterministic "input needed" signal `claude --print` never
// provided): `choice` lets the picker self-focus (input NOT focused), `text`
// focuses the chat input, and a plain turn steals no focus.

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

const choiceBlock =
  '```cam-ask\n{"type":"choice","question":"Pick","options":[{"label":"A","value":"a"}]}\n```';
const textBlock = '```cam-ask\n{"type":"text","question":"What name?"}\n```';

function emitAssistant(content: string) {
  eventCb!({
    type: 'spawn_message',
    sessionId: 'sess-1',
    message: { role: 'assistant', content, timestamp: new Date().toISOString() },
  });
}

function emitExit() {
  eventCb!({ type: 'spawn_exit', sessionId: 'sess-1', status: 'done', claudeSessionId: 'claude-1' });
}

async function renderReady() {
  render(<AgentChat agentName="tester" cwd="/p" resumeSessionId="claude-1" initialMessage="hi" />);
  await waitFor(() => expect(spawnMock).toHaveBeenCalled());
  await waitFor(() => expect(eventCb).not.toBeNull());
  focusSpy.mockClear();
}

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

describe('AgentChat prompt-driven focus', () => {
  it('does not focus the input for a choice prompt (the picker self-focuses)', async () => {
    await renderReady();
    emitAssistant(choiceBlock);
    await new Promise((r) => setTimeout(r, 0)); // let the message land in state
    emitExit();
    await new Promise((r) => setTimeout(r, 10));
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('focuses the input for a text prompt', async () => {
    await renderReady();
    emitAssistant(textBlock);
    await new Promise((r) => setTimeout(r, 0)); // let the message land in state
    emitExit();
    await waitFor(() => expect(focusSpy).toHaveBeenCalled());
  });

  it('does not steal focus for a plain assistant turn (no prompt)', async () => {
    await renderReady();
    emitAssistant('All done, no question here.');
    emitExit();
    await new Promise((r) => setTimeout(r, 10));
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('does not steal focus when the window is hidden', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    await renderReady();
    emitAssistant(textBlock);
    emitExit();
    await new Promise((r) => setTimeout(r, 10));
    expect(focusSpy).not.toHaveBeenCalled();
  });
});
