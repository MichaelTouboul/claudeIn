import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ChatMessage } from '@/types/spawn.types';

import { MessageRow } from './MessageRow';

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
});
