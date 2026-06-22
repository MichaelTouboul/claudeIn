import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BranchChip } from '@/components/Dashboard/AgentChat/AgentChatInput/ComposerStatusBar/BranchChip/BranchChip';

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('BranchChip', () => {
  it('renders the branch name as a copy button', () => {
    render(<BranchChip branch="feat/vst-consolidated-mcp-insights" />);
    const btn = screen.getByRole('button', { name: 'Copy branch name' });
    expect(btn).toHaveTextContent('feat/vst-consolidated-mcp-insights');
  });

  it('copies the full branch name to the clipboard on click and shows feedback', async () => {
    render(<BranchChip branch="feat/vst-consolidated-mcp-insights" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy branch name' }));

    expect(writeText).toHaveBeenCalledWith('feat/vst-consolidated-mcp-insights');
    // The transient "Copied!" feedback is reflected on the button title.
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Copied!'),
    );
  });

  it('reverts the copied feedback after the timeout', async () => {
    render(<BranchChip branch="main" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy branch name' }));

    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('title', 'Copied!'));
    // The ~1.2s transient feedback reverts on its own back to the idle title.
    await waitFor(
      () => expect(screen.getByRole('button')).toHaveAttribute('title', 'Copy branch name'),
      { timeout: 2000 },
    );
  });

  it('renders a plain non-interactive read-out when there is no branch', () => {
    render(<BranchChip branch={null} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
