import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityLine } from '@/components/Dashboard/AgentChat/AgentChatMessages/ActivityLine';

describe('ActivityLine', () => {
  it('renders nothing when not active', () => {
    const { container } = render(<ActivityLine active={false} activity={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows Thinking… when active with no tool yet', () => {
    render(<ActivityLine active activity={null} />);
    expect(screen.getByText('Thinking…')).toBeInTheDocument();
  });

  it('shows a verb + target label for a tool activity', () => {
    render(<ActivityLine active activity={{ tool: 'Read', target: 'a.ts' }} />);
    expect(screen.getByText('Reading a.ts')).toBeInTheDocument();
  });

  it('quotes the pattern for a search tool', () => {
    render(<ActivityLine active activity={{ tool: 'Grep', target: 'foo' }} />);
    expect(screen.getByText('Searching "foo"')).toBeInTheDocument();
  });

  it('is a plain element (not a button) without an opener', () => {
    render(<ActivityLine active activity={null} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is clickable and opens the workflow when an opener is supplied', () => {
    const onOpenWorkflow = vi.fn();
    render(<ActivityLine active activity={{ tool: 'Edit', target: 'x.ts' }} onOpenWorkflow={onOpenWorkflow} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpenWorkflow).toHaveBeenCalledOnce();
  });
});
