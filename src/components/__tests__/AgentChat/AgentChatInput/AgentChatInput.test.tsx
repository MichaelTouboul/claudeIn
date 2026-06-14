import { act, render } from '@testing-library/react';
import { type Ref, useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentChatInput } from '@/components/AgentChat/AgentChatInput/AgentChatInput';
import type { RichEditorHandle } from '@/components/AgentChat/RichEditor/RichEditor';
import type { AgentSummary } from '@/lib/types';
import { useDashboardStore } from '@/store/useDashboardStore';

// Capture the RichEditor wiring so a test can simulate the user pressing Tab (onComplete)
// or Enter (onEnter) while a suggestion menu is open, and observe the imperative-handle
// calls — without pulling Lexical into the test.
let editorOnChange: ((markdown: string, plain: string) => void) | null = null;
let editorOnEnter: (() => boolean) | null = null;
let editorOnComplete: (() => boolean) | null = null;

const insertSlashCommand = vi.fn();
const insertMention = vi.fn();
const focus = vi.fn();
const clear = vi.fn();

vi.mock('@/components/AgentChat/RichEditor/RichEditor', () => ({
  RichEditor: ({
    handleRef,
    onChange,
    onEnter,
    onComplete,
  }: {
    handleRef: Ref<RichEditorHandle>;
    onChange: (markdown: string, plain: string) => void;
    onEnter: () => boolean;
    onComplete: () => boolean;
  }) => {
    useImperativeHandle(handleRef, () => ({ focus, clear, insertMention, insertSlashCommand }));
    editorOnChange = onChange;
    editorOnEnter = onEnter;
    editorOnComplete = onComplete;
    return <div data-testid="rich-editor" />;
  },
}));

// Trim heavy leaves that aren't under test here.
vi.mock('@/components/AgentChat/AgentChatInput/AttachMenu/AttachMenu', () => ({
  AttachMenu: () => <div />,
}));
vi.mock('@/components/AgentChat/AgentChatInput/AgentTabs/AgentTabs', () => ({
  AgentTabs: () => <div />,
}));

function makeAgent(name: string): AgentSummary {
  return {
    id: name,
    scope: 'project',
    filePath: `/a/${name}.md`,
    relativePath: `${name}.md`,
    folder: '',
    frontmatter: { name, description: '' },
    subAgents: [],
    shadowed: false,
  };
}

const onSelectSlash = vi.fn();
const onSend = vi.fn();

function renderInput() {
  return render(
    <AgentChatInput
      input=""
      attachedFiles={[]}
      waitingInput={false}
      isRunning={false}
      spawning={false}
      session={null}
      claudeSessionId={null}
      agentName="tester"
      editorRef={{ current: null }}
      onInputChange={() => {}}
      onSelectSlash={onSelectSlash}
      modelPickerOpen={false}
      onSelectModel={() => {}}
      onCloseModelPicker={() => {}}
      onRemoveAttachment={() => {}}
      onAttach={() => {}}
      onSend={onSend}
    />,
  );
}

beforeEach(() => {
  editorOnChange = null;
  editorOnEnter = null;
  editorOnComplete = null;
  insertSlashCommand.mockReset();
  insertMention.mockReset();
  focus.mockReset();
  clear.mockReset();
  onSelectSlash.mockReset();
  onSend.mockReset();
  useDashboardStore.setState({ agents: [makeAgent('committer')], skills: [] });
});

describe('AgentChatInput — Tab completes a slash command (no launch)', () => {
  it('Tab inserts the command text into the input and does NOT launch or submit it', () => {
    renderInput();
    // Open the slash menu by typing `/c` (matches /clear, /compact, …).
    act(() => editorOnChange?.('/c', '/c'));

    const consumed = editorOnComplete?.();

    expect(consumed).toBe(true);
    // Completed the text into the editor, keeping focus.
    expect(insertSlashCommand).toHaveBeenCalledTimes(1);
    expect(insertSlashCommand.mock.calls[0][0]).toMatch(/^\//);
    expect(focus).toHaveBeenCalled();
    // Crucially: the command was NOT dispatched/launched and nothing was sent.
    expect(onSelectSlash).not.toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });

  it('Enter still launches the slash command (select + dispatch), unlike Tab', () => {
    renderInput();
    act(() => editorOnChange?.('/c', '/c'));

    const consumed = editorOnEnter?.();

    expect(consumed).toBe(true);
    // Enter routes through the dispatch path and clears the editor.
    expect(onSelectSlash).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    // Enter is not a text-completion, so it must not call insertSlashCommand.
    expect(insertSlashCommand).not.toHaveBeenCalled();
  });

  it('Tab on a mention inserts the mention text without launching anything', () => {
    renderInput();
    act(() => editorOnChange?.('@co', '@co'));

    const consumed = editorOnComplete?.();

    expect(consumed).toBe(true);
    expect(insertMention).toHaveBeenCalledWith('committer');
    expect(onSelectSlash).not.toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('Tab does nothing (lets default focus behavior run) when no menu is open', () => {
    renderInput();
    act(() => editorOnChange?.('hello', 'hello'));

    expect(editorOnComplete?.()).toBe(false);
    expect(insertSlashCommand).not.toHaveBeenCalled();
    expect(insertMention).not.toHaveBeenCalled();
  });
});
