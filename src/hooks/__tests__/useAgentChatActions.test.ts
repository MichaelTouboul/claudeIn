import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RichEditorHandle } from '@/components/AgentChat/RichEditor/RichEditor';
import type { SpawnSession } from '@/types/spawn.types';

import { useAgentChatActions } from '../useAgentChatActions';

const spawnMock = vi.fn();
const sendInputMock = vi.fn();
const clearConversationApiMock = vi.fn();
const openFilePickerMock = vi.fn();
const readImageAsDataUrlMock = vi.fn();

const editorClear = vi.fn();
const editorFocus = vi.fn();

function makeParams(overrides: Partial<Parameters<typeof useAgentChatActions>[0]> = {}) {
  const editorRef = { current: { clear: editorClear, focus: editorFocus, insertMention: vi.fn() } as RichEditorHandle };
  const pendingUserMsgs = { current: new Set<string>() };
  return {
    input: '',
    attachedFiles: [] as { path: string; dataUrl: string | null }[],
    awaitingResponse: false,
    compacting: false,
    session: null as SpawnSession | null,
    isRunning: false,
    agentName: 'tester',
    projectPath: '/p',
    claudeSessionId: 'claude-1',
    model: undefined as string | undefined,
    openModelPicker: vi.fn(),
    openView: vi.fn(),
    openImprove: vi.fn(),
    editorRef,
    pendingUserMsgs,
    setInput: vi.fn(),
    setAttachedFiles: vi.fn(),
    setQueue: vi.fn(),
    setMessages: vi.fn(),
    setAwaitingResponse: vi.fn(),
    setWaitingInput: vi.fn(),
    setSession: vi.fn(),
    setClaudeSessionId: vi.fn(),
    ...overrides,
  } satisfies Parameters<typeof useAgentChatActions>[0];
}

beforeEach(() => {
  spawnMock.mockReset().mockResolvedValue({ claudeSessionId: 'claude-2' });
  sendInputMock.mockReset().mockResolvedValue(undefined);
  clearConversationApiMock.mockReset().mockResolvedValue(undefined);
  openFilePickerMock.mockReset().mockResolvedValue([]);
  readImageAsDataUrlMock.mockReset().mockResolvedValue('data:image/png;base64,xxx');
  editorClear.mockClear();
  editorFocus.mockClear();
  window.api = {
    spawn: spawnMock,
    sendInput: sendInputMock,
    clearConversation: clearConversationApiMock,
    openFilePicker: openFilePickerMock,
    readImageAsDataUrl: readImageAsDataUrlMock,
  } as unknown as typeof window.api;
});

describe('useAgentChatActions handleSend — /clear', () => {
  it('instantly clears the conversation and does NOT spawn', async () => {
    const params = makeParams({ input: '/clear' });
    params.pendingUserMsgs.current.add('stale');
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleSend();

    // (a) messages emptied
    expect(params.setMessages).toHaveBeenCalledWith([]);
    // (b) context reset for a fresh next message
    expect(params.setClaudeSessionId).toHaveBeenCalledWith(null);
    expect(params.setSession).toHaveBeenCalledWith(null);
    // queue + flags reset
    expect(params.setQueue).toHaveBeenCalledWith([]);
    expect(params.setAwaitingResponse).toHaveBeenCalledWith(false);
    expect(params.setWaitingInput).toHaveBeenCalledWith(false);
    expect(params.pendingUserMsgs.current.size).toBe(0);
    expect(editorClear).toHaveBeenCalled();
    // (c) no process spawned, no input sent — instant client-side clear
    expect(spawnMock).not.toHaveBeenCalled();
    expect(sendInputMock).not.toHaveBeenCalled();
    // (d) the clear is PERSISTED for the current conversation so a reload stays empty
    expect(clearConversationApiMock).toHaveBeenCalledWith('claude-1');
  });

  it('does not call the persist API when there is no claude session yet', async () => {
    const params = makeParams({ input: '/clear', claudeSessionId: null });
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleSend();

    expect(params.setMessages).toHaveBeenCalledWith([]);
    // Nothing persisted on disk exists to clear, so the API is not called.
    expect(clearConversationApiMock).not.toHaveBeenCalled();
  });
});

describe('useAgentChatActions handleSend — normal message (regression guard)', () => {
  it('still spawns a normal mission with resume', async () => {
    const params = makeParams({ input: 'do the thing' });
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleSend();

    expect(spawnMock).toHaveBeenCalledWith(
      expect.objectContaining({ agent_name: 'tester', mission: 'do the thing', cwd: '/p', resume_session_id: 'claude-1' }),
    );
    // a user bubble is pushed for a real message (not for /clear)
    expect(params.setMessages).toHaveBeenCalled();
    expect(params.setClaudeSessionId).toHaveBeenCalledWith('claude-2');
  });

  it('passes the selected model on spawn when one is set', async () => {
    const params = makeParams({ input: 'do the thing', model: 'claude-opus-4-8' });
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleSend();

    expect(spawnMock).toHaveBeenCalledWith(
      expect.objectContaining({ mission: 'do the thing', model: 'claude-opus-4-8' }),
    );
  });

  it('opens the model picker for /model instead of spawning', async () => {
    const params = makeParams({ input: '/model' });
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleSend();

    expect(params.openModelPicker).toHaveBeenCalledTimes(1);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('opens the agents view for /agents instead of spawning', async () => {
    const params = makeParams({ input: '/agents' });
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleSend();

    expect(params.openView).toHaveBeenCalledWith('agents');
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('opens the skills view for /skills instead of spawning', async () => {
    const params = makeParams({ input: '/skills' });
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleSend();

    expect(params.openView).toHaveBeenCalledWith('skills');
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('opens the improve modal (target null) for /improve instead of spawning', async () => {
    const params = makeParams({ input: '/improve' });
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleSend();

    expect(params.openImprove).toHaveBeenCalledWith(null);
    expect(spawnMock).not.toHaveBeenCalled();
    expect(sendInputMock).not.toHaveBeenCalled();
  });

  it('opens the improve modal for the /feature-request alias too', async () => {
    const params = makeParams({ input: '/feature-request' });
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleSend();

    expect(params.openImprove).toHaveBeenCalledWith(null);
    expect(spawnMock).not.toHaveBeenCalled();
  });
});

describe('useAgentChatActions handleAttach — picker kind', () => {
  it('opens an unfiltered picker by default and attaches non-image files', async () => {
    openFilePickerMock.mockResolvedValueOnce(['/docs/spec.pdf']);
    const setAttachedFiles = vi.fn();
    const params = makeParams({ setAttachedFiles });
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleAttach();

    // default kind is "all"
    expect(openFilePickerMock).toHaveBeenCalledWith('all');
    // a non-image file is attached with a null dataUrl (no image read)
    expect(readImageAsDataUrlMock).not.toHaveBeenCalled();
    const updater = setAttachedFiles.mock.calls[0][0] as (p: { path: string; dataUrl: string | null }[]) => unknown;
    expect(updater([])).toEqual([{ path: '/docs/spec.pdf', dataUrl: null }]);
  });

  it('opens an image-scoped picker and reads the image as a data url when kind="image"', async () => {
    openFilePickerMock.mockResolvedValueOnce(['/pics/photo.png']);
    const setAttachedFiles = vi.fn();
    const params = makeParams({ setAttachedFiles });
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleAttach('image');

    expect(openFilePickerMock).toHaveBeenCalledWith('image');
    expect(readImageAsDataUrlMock).toHaveBeenCalledWith('/pics/photo.png');
    const updater = setAttachedFiles.mock.calls[0][0] as (p: { path: string; dataUrl: string | null }[]) => unknown;
    expect(updater([])).toEqual([{ path: '/pics/photo.png', dataUrl: 'data:image/png;base64,xxx' }]);
  });

  it('no-ops when the picker is cancelled (empty selection)', async () => {
    openFilePickerMock.mockResolvedValueOnce([]);
    const params = makeParams();
    const { result } = renderHook(() => useAgentChatActions(params));

    await result.current.handleAttach('all');

    expect(params.setAttachedFiles).not.toHaveBeenCalled();
  });
});
