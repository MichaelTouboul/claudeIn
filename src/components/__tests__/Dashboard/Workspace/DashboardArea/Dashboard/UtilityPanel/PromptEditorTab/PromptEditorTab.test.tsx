import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptEditorTab } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/PromptEditorTab/PromptEditorTab';
import { useComposerBridgeStore } from '@/store/dashboard/useComposerBridgeStore';
import { type PanelTab, PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';

function promptTab(text: string): PanelTab {
  return {
    id: 'prompt-editor:c1',
    kind: PanelTabKind.PromptEditor,
    title: 'Éditeur de prompt',
    payload: { composerId: 'c1', text },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  useComposerBridgeStore.setState({ handlers: {} });
  usePanelStore.setState({ isOpen: true, current: promptTab('Hello world'), width: 480 });
});

describe('PromptEditorTab', () => {
  it('renders the draft text and a live word/char count', () => {
    render(<PromptEditorTab tab={promptTab('Hello world')} />);
    expect(screen.getByRole('textbox')).toHaveValue('Hello world');
    expect(screen.getByText('2 words · 11 characters')).toBeInTheDocument();
  });

  it('shows the format toolbar buttons', () => {
    render(<PromptEditorTab tab={promptTab('x')} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ordered list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert an agent' })).toBeInTheDocument();
  });

  it('Save writes the draft back into the composer without sending', () => {
    const setInput = vi.fn();
    const send = vi.fn();
    useComposerBridgeStore.getState().register('c1', { setInput, send });
    render(<PromptEditorTab tab={usePanelStore.getState().current as PanelTab} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(setInput).toHaveBeenCalledWith('Hello world');
    expect(send).not.toHaveBeenCalled();
    expect(usePanelStore.getState().isOpen).toBe(true);
  });

  it('Send writes the draft, fires send, and closes the panel', () => {
    const setInput = vi.fn();
    const send = vi.fn();
    useComposerBridgeStore.getState().register('c1', { setInput, send });
    render(<PromptEditorTab tab={usePanelStore.getState().current as PanelTab} />);
    fireEvent.click(screen.getByRole('button', { name: /Send/ }));
    expect(setInput).toHaveBeenCalledWith('Hello world');
    expect(usePanelStore.getState().isOpen).toBe(false);
    vi.runAllTimers();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('a format button rewrites the draft markdown in the store', () => {
    render(<PromptEditorTab tab={usePanelStore.getState().current as PanelTab} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 5);
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
    const cur = usePanelStore.getState().current;
    if (cur?.kind !== PanelTabKind.PromptEditor) throw new Error('not a prompt-editor object');
    expect(cur.payload.text).toBe('**Hello** world');
  });
});
