import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AskPrompt as AskPromptType } from '@/components/Dashboard/AgentChat/askPrompt';
import { AskPrompt } from '@/components/Dashboard/AgentChat/AskPrompt/AskPrompt';

const choice: AskPromptType = {
  type: 'choice',
  question: 'Which approach?',
  options: [
    { label: 'Alpha', value: 'a', variant: 'accept' },
    { label: 'Beta', value: 'b', variant: 'deny' },
    { label: 'Gamma', value: 'c' },
  ],
};

function selectedLabel(): string | undefined {
  const selected = screen
    .getAllByRole('option')
    .find((o) => o.getAttribute('aria-selected') === 'true');
  return selected?.textContent ?? undefined;
}

describe('AskPrompt', () => {
  it('moves the highlight with ArrowDown / ArrowUp and clamps at the ends', () => {
    render(<AskPrompt prompt={choice} isActive onAnswer={vi.fn()} />);
    const list = screen.getByRole('listbox');
    expect(selectedLabel()).toContain('Alpha');

    fireEvent.keyDown(list, { key: 'ArrowUp' }); // clamp at top
    expect(selectedLabel()).toContain('Alpha');

    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(selectedLabel()).toContain('Beta');

    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowDown' }); // clamp at bottom
    expect(selectedLabel()).toContain('Gamma');

    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(selectedLabel()).toContain('Beta');
  });

  it('calls onAnswer with the highlighted value on Enter', () => {
    const onAnswer = vi.fn();
    render(<AskPrompt prompt={choice} isActive onAnswer={onAnswer} />);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onAnswer).toHaveBeenCalledWith('b');
  });

  it('calls onAnswer when an option is clicked', () => {
    const onAnswer = vi.fn();
    render(<AskPrompt prompt={choice} isActive onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText('Gamma'));
    expect(onAnswer).toHaveBeenCalledWith('c');
  });

  it('submits the Nth option with a number shortcut', () => {
    const onAnswer = vi.fn();
    render(<AskPrompt prompt={choice} isActive onAnswer={onAnswer} />);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: '2' });
    expect(onAnswer).toHaveBeenCalledWith('b');
  });

  it('is inert when not active: no onAnswer on key or click', () => {
    const onAnswer = vi.fn();
    render(<AskPrompt prompt={choice} isActive={false} onAnswer={onAnswer} />);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'Enter' });
    fireEvent.click(screen.getByText('Alpha'));
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('renders nothing for a text prompt', () => {
    const { container } = render(
      <AskPrompt prompt={{ type: 'text', question: 'Q' }} isActive onAnswer={vi.fn()} />
    );
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});

const authPrompt: AskPromptType = {
  type: 'choice',
  question:
    'The mcp__claude_ai_Slack__slack_send_message permission was denied. Approve?',
  options: [
    { label: 'Approuver', value: 'yes', variant: 'accept' },
    { label: 'Toujours autoriser', value: 'always', variant: 'accept' },
    { label: 'Refuser', value: 'no', variant: 'deny' },
  ],
};

describe('AskPrompt — authorization card', () => {
  it('renders the server badge and the full MCP tool chip', () => {
    render(<AskPrompt prompt={authPrompt} isActive onAnswer={vi.fn()} />);
    expect(screen.getByText('slack')).toBeInTheDocument();
    expect(
      screen.getByText('mcp__claude_ai_Slack__slack_send_message'),
    ).toBeInTheDocument();
  });

  it('exposes the options as a roving listbox with action buttons', () => {
    render(<AskPrompt prompt={authPrompt} isActive onAnswer={vi.fn()} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Approuver' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Refuser' })).toBeInTheDocument();
  });

  it('calls onAnswer when an action button is clicked', () => {
    const onAnswer = vi.fn();
    render(<AskPrompt prompt={authPrompt} isActive onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole('option', { name: 'Refuser' }));
    expect(onAnswer).toHaveBeenCalledWith('no');
  });

  it('submits via keyboard like the plain picker', () => {
    const onAnswer = vi.fn();
    render(<AskPrompt prompt={authPrompt} isActive onAnswer={onAnswer} />);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: '2' });
    expect(onAnswer).toHaveBeenCalledWith('always');
  });
});
