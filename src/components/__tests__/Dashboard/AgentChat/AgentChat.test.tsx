import { render, screen, waitFor } from '@testing-library/react';
import { useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentChat } from '@/components/Dashboard/AgentChat/AgentChat';
import type { RichEditorHandle } from '@/components/Dashboard/AgentChat/RichEditor/RichEditor';
import type { SpawnSession } from '@/lib/types';
import { useModelStore } from '@/store/dashboard/useModelStore';

// Focus is now driven by the structured `cam-ask` prompt in the last agent
// message (the deterministic "input needed" signal `claude --print` never
// provided): `choice` lets the picker self-focus (input NOT focused), `text`
// focuses the chat input, and a plain turn steals no focus.

const focusSpy = vi.fn();

// Captured RichEditor callbacks so a test can simulate typing + submitting a
// message (the only way to populate the send queue through the real flow).
let editorOnChange: ((markdown: string, plain: string) => void) | null = null;
let editorOnSubmit: (() => void) | null = null;

// Mock RichEditor: forward the focus() spy through the imperative handle so a
// real editorRef.current.focus() call is observable, without pulling in Lexical.
vi.mock('@/components/Dashboard/AgentChat/RichEditor/RichEditor', () => ({
  RichEditor: ({
    handleRef,
    onChange,
    onSubmit,
  }: {
    handleRef: React.Ref<RichEditorHandle>;
    onChange: (markdown: string, plain: string) => void;
    onSubmit: () => void;
  }) => {
    useImperativeHandle(handleRef, () => ({
      focus: focusSpy,
      clear: vi.fn(),
      insertMention: vi.fn(),
      insertSlashCommand: vi.fn(),
    }));
    editorOnChange = onChange;
    editorOnSubmit = onSubmit;
    return <div data-testid="rich-editor" />;
  },
}));

// Trim other heavy/irrelevant leaves.
vi.mock('@/components/Dashboard/AgentChat/AgentChatHeader/AgentChatHeader', () => ({ AgentChatHeader: () => <div /> }));
vi.mock('@/components/Dashboard/AgentChat/AgentChatMessages/AgentChatMessages', () => ({ AgentChatMessages: () => <div /> }));

let eventCb: ((data: unknown) => void) | null = null;
const spawnMock = vi.fn();

const session: SpawnSession = {
  localSessionId: 'sess-1',
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
    localSessionId: 'sess-1',
    message: { role: 'assistant', content, timestamp: new Date().toISOString() },
  });
}

function emitExit() {
  eventCb!({ type: 'spawn_exit', localSessionId: 'sess-1', status: 'done', claudeSessionId: 'claude-1' });
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
  editorOnChange = null;
  editorOnSubmit = null;
  useModelStore.setState({ models: {} });
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

describe('AgentChat resume entry', () => {
  it('auto-send resume passes the session id as resume_session_id', async () => {
    render(<AgentChat agentName="tester" cwd="/p" resumeSessionId="claude-1" initialMessage="hi" />);
    await waitFor(() => expect(spawnMock).toHaveBeenCalled());
    expect(spawnMock).toHaveBeenCalledWith(
      expect.objectContaining({ resume_session_id: 'claude-1', mission: 'hi', cwd: '/p' }),
    );
  });

  it('"continue as is" (resume, no initial message) does NOT spawn fresh on mount', async () => {
    // The viewer's plain-resume entry mounts AgentChat with resumeSessionId and
    // no initialMessage: it must seed the claude session id and wait for the
    // first user message to drive `--resume`, never auto-spawn a fresh session.
    render(<AgentChat agentName="" cwd="/p" resumeSessionId="claude-1" />);
    await new Promise((r) => setTimeout(r, 10));
    expect(spawnMock).not.toHaveBeenCalled();
  });
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

describe('AgentChat compact-on-resume', () => {
  it('fires one /compact turn with the resume id and shows the compacting status', async () => {
    render(<AgentChat agentName="tester" cwd="/p" resumeSessionId="claude-1" compactOnResume />);

    await waitFor(() => expect(spawnMock).toHaveBeenCalled());
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock).toHaveBeenCalledWith(
      expect.objectContaining({ mission: '/compact', resume_session_id: 'claude-1', cwd: '/p' }),
    );
    // Status banner appears; the input (rich editor) stays mounted/free.
    expect(await screen.findByText(/compacting context/i)).toBeInTheDocument();
    expect(screen.getByTestId('rich-editor')).toBeInTheDocument();
  });

  it('does NOT render a "/compact" user message for the compact turn', async () => {
    render(<AgentChat agentName="tester" cwd="/p" resumeSessionId="claude-1" compactOnResume />);
    await waitFor(() => expect(spawnMock).toHaveBeenCalled());
    await screen.findByText(/compacting context/i);
    // The only "/compact" anywhere is the spawn mission arg — never rendered text.
    expect(screen.queryByText('/compact')).not.toBeInTheDocument();
  });

  it('flips the status to compacted on a spawn_compacted event', async () => {
    render(<AgentChat agentName="tester" cwd="/p" resumeSessionId="claude-1" compactOnResume />);
    await waitFor(() => expect(spawnMock).toHaveBeenCalled());
    await waitFor(() => expect(eventCb).not.toBeNull());
    await screen.findByText(/compacting context/i);

    eventCb!({ type: 'spawn_compacted', localSessionId: 'sess-1' });

    expect(await screen.findByText(/context compacted/i)).toBeInTheDocument();
  });
});

describe('AgentChat model threading', () => {
  const act = async (fn: () => void) => {
    fn();
    await new Promise((r) => setTimeout(r, 0));
  };

  it('threads a model picked under the stable tab key into the first (resume) spawn', async () => {
    // The key is the owning tab id (STABLE) — NOT session.localSessionId — so a
    // model chosen before the first spawn is honored, not orphaned when the
    // session arrives. (regression: conversationKey shift on first setSession)
    useModelStore.getState().setModel('tab-1', 'claude-opus-4-8');
    render(
      <AgentChat agentName="tester" tabId="tab-1" cwd="/p" resumeSessionId="claude-1" initialMessage="hi" />,
    );
    await waitFor(() => expect(spawnMock).toHaveBeenCalled());
    expect(spawnMock).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-opus-4-8' }));
  });

  it('keeps honoring the tab-keyed model across a queue-flushed turn after the session id is known', async () => {
    // Reproduces BOTH prior blockers: (1) the key must not shift to localSessionId
    // once the session exists; (2) the queue flush must use the LATEST closure
    // (via sendNextFromQueueRef), reflecting a model changed mid-conversation.
    render(
      <AgentChat agentName="tester" tabId="tab-1" cwd="/p" resumeSessionId="claude-1" initialMessage="hi" />,
    );
    await waitFor(() => expect(spawnMock).toHaveBeenCalled());
    await waitFor(() => expect(eventCb).not.toBeNull());
    await waitFor(() => expect(editorOnSubmit).not.toBeNull());

    // First turn is in flight (awaitingResponse). User picks a model now, then
    // queues a second message while still awaiting — it must flush with that model.
    await act(() => useModelStore.getState().setModel('tab-1', 'claude-sonnet-4-6'));
    await act(() => editorOnChange!('next turn', 'next turn'));
    await act(() => editorOnSubmit!());

    spawnMock.mockClear();
    // Assistant reply for the first turn drives the queue flush.
    await act(() => emitAssistant('done with first'));
    await new Promise((r) => setTimeout(r, 150));

    expect(spawnMock).toHaveBeenCalledWith(
      expect.objectContaining({ mission: 'next turn', model: 'claude-sonnet-4-6' }),
    );
  });

  it('omits model when none is selected for the conversation (claude default)', async () => {
    render(
      <AgentChat agentName="tester" tabId="tab-1" cwd="/p" resumeSessionId="claude-1" initialMessage="hi" />,
    );
    await waitFor(() => expect(spawnMock).toHaveBeenCalled());
    expect(spawnMock).toHaveBeenCalledWith(expect.objectContaining({ model: undefined }));
  });
});
