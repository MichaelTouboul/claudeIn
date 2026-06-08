import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PanelTabKind, textTabId, usePanelStore } from '@/store/usePanelStore';
import type { ChatMessage } from '@/types/spawn.types';

import { MessageRow } from './MessageRow';

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, tabs: [], activeTabId: null });
});

function assistant(content: string): ChatMessage {
  return { id: 'm1', role: 'assistant', content, timestamp: new Date().toISOString() };
}

function user(content: string): ChatMessage {
  return { id: 'u1', role: 'user', content, timestamp: new Date().toISOString() };
}

const authBlock =
  '```cam-ask\n' +
  '{"type":"choice","question":"Proceed?","options":[' +
  '{"label":"Yes","value":"yes","variant":"accept"},' +
  '{"label":"No","value":"no","variant":"deny"}]}\n' +
  '```';

describe('MessageRow', () => {
  it('shows the authorization header for an accept/deny choice prompt', () => {
    render(<MessageRow msg={assistant(authBlock)} isLast onAnswer={vi.fn()} />);
    expect(screen.getByText('authorization')).toBeInTheDocument();
    expect(screen.queryByText('agent')).not.toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows the agent header and no picker for a plain assistant message', () => {
    render(<MessageRow msg={assistant('All done.')} isLast onAnswer={vi.fn()} />);
    expect(screen.getByText('agent')).toBeInTheDocument();
    expect(screen.queryByText('authorization')).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders a slash-command invocation as a chip, not raw XML', () => {
    const content =
      '<command-name>/compact</command-name><command-message>compact</command-message><command-args></command-args>';
    render(<MessageRow msg={user(content)} isLast={false} onAnswer={vi.fn()} />);
    expect(screen.getByText('/compact')).toBeInTheDocument();
    expect(screen.queryByText(/command-name/)).not.toBeInTheDocument();
  });

  it('renders a caveat-only user message as nothing', () => {
    const { container } = render(
      <MessageRow
        msg={user('<local-command-caveat>boilerplate</local-command-caveat>')}
        isLast={false}
        onAnswer={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders normal user prose that quotes a tag unchanged', () => {
    const content = 'look: <local-command-stdout>Compacted </local-command-stdout> ugh!';
    render(<MessageRow msg={user(content)} isLast={false} onAnswer={vi.fn()} />);
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('copies the message content and shows the copied state on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<MessageRow msg={assistant('Hello world')} isLast onAnswer={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Copy message' });
    fireEvent.click(button);

    expect(writeText).toHaveBeenCalledWith('Hello world');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument(),
    );
  });

  it('renders no copy button for an empty-content message', () => {
    render(<MessageRow msg={assistant('   ')} isLast onAnswer={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Copy message' })).not.toBeInTheDocument();
  });

  it('opens the message prose as a Text panel tab from the footer button', () => {
    const content = 'Here is a summary of the work.';
    render(<MessageRow msg={assistant(content)} isLast onAnswer={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open in panel' }));
    const s = usePanelStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.tabs).toHaveLength(1);
    const tab = s.tabs[0];
    expect(tab.id).toBe(textTabId({ text: content }));
    expect(tab.kind).toBe(PanelTabKind.Text);
    expect(tab.payload).toEqual({ text: content });
  });

  it('shows no panel footer button for an authorization prompt or empty prose', () => {
    const { rerender } = render(<MessageRow msg={assistant(authBlock)} isLast onAnswer={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Open in panel' })).not.toBeInTheDocument();
    rerender(<MessageRow msg={assistant('   ')} isLast onAnswer={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Open in panel' })).not.toBeInTheDocument();
  });
});
