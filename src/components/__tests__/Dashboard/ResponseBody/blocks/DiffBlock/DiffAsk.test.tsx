import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LineKind } from '@/components/Dashboard/ResponseBody/blocks/DiffBlock/diff.types';
import { DiffBlock } from '@/components/Dashboard/ResponseBody/blocks/DiffBlock/DiffBlock';
import { PanelTabKind } from '@/store/dashboard/usePanelStore';

const transformMock = vi.fn<(input: unknown) => Promise<string>>();
window.api = { transform: transformMock } as unknown as typeof window.api;

afterEach(() => {
  transformMock.mockReset();
});

const diff = {
  filePath: '/repo/a.ts',
  lines: [
    { id: 'l0', kind: LineKind.Context, oldNo: 1, newNo: 1, text: 'keep' },
    { id: 'l1', kind: LineKind.Del, oldNo: 2, newNo: null, text: 'old line' },
    { id: 'l2', kind: LineKind.Add, oldNo: null, newNo: 2, text: 'new line' },
  ],
};

function openAskOn(text: string) {
  const row = screen.getByText(text).closest('.group\\/row') as HTMLElement;
  const button = row.querySelector('button[aria-label="Ask Claude about this line"]') as HTMLElement;
  fireEvent.click(button);
}

describe('DiffBlock ask-on-line', () => {
  it('exposes a per-line ask affordance for every diff line', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    expect(screen.getAllByLabelText('Ask Claude about this line')).toHaveLength(3);
  });

  it('opens a single-line input under the clicked line', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    expect(screen.queryByLabelText('Ask about this line')).not.toBeInTheDocument();
    openAskOn('new line');
    expect(screen.getByLabelText('Ask about this line')).toBeInTheDocument();
  });

  it('closes the input on Escape', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    openAskOn('new line');
    fireEvent.keyDown(screen.getByLabelText('Ask about this line'), { key: 'Escape' });
    expect(screen.queryByLabelText('Ask about this line')).not.toBeInTheDocument();
  });

  it('submits the question via transform with kind text and a context block', async () => {
    transformMock.mockResolvedValue('## answer\n\nbecause reasons');
    render(<DiffBlock diff={diff} toolName="Edit" />);
    openAskOn('new line');

    const input = screen.getByLabelText('Ask about this line');
    fireEvent.change(input, { target: { value: 'why this change?' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(transformMock).toHaveBeenCalledTimes(1));
    const arg = transformMock.mock.calls[0][0] as {
      kind: string;
      instruction: string;
      content: string;
    };
    expect(arg.kind).toBe(PanelTabKind.Text);
    expect(arg.instruction).toContain('why this change?');
    expect(arg.content).toContain('/repo/a.ts');
    expect(arg.content).toContain('new line');
  });

  it('renders the returned answer as markdown', async () => {
    transformMock.mockResolvedValue('the explanation');
    render(<DiffBlock diff={diff} toolName="Edit" />);
    openAskOn('new line');

    const input = screen.getByLabelText('Ask about this line');
    fireEvent.change(input, { target: { value: 'explain' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(screen.getByText('the explanation')).toBeInTheDocument());
  });

  it('collapses to nothing on an empty transform result', async () => {
    transformMock.mockResolvedValue('');
    render(<DiffBlock diff={diff} toolName="Edit" />);
    openAskOn('new line');

    const input = screen.getByLabelText('Ask about this line');
    fireEvent.change(input, { target: { value: 'explain' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(transformMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByLabelText('Dismiss answer')).not.toBeInTheDocument(),
    );
    expect(screen.queryByLabelText('Ask about this line')).not.toBeInTheDocument();
  });

  it('collapses to nothing when the transform rejects', async () => {
    transformMock.mockRejectedValue(new Error('ipc blew up'));
    render(<DiffBlock diff={diff} toolName="Edit" />);
    openAskOn('new line');

    const input = screen.getByLabelText('Ask about this line');
    fireEvent.change(input, { target: { value: 'explain' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(transformMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByLabelText('Dismiss answer')).not.toBeInTheDocument(),
    );
  });

  it('dismisses the answer popover', async () => {
    transformMock.mockResolvedValue('the explanation');
    render(<DiffBlock diff={diff} toolName="Edit" />);
    openAskOn('new line');

    const input = screen.getByLabelText('Ask about this line');
    fireEvent.change(input, { target: { value: 'explain' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(screen.getByText('the explanation')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Dismiss answer'));
    expect(screen.queryByText('the explanation')).not.toBeInTheDocument();
  });

  it('keeps only one active ask at a time', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    openAskOn('new line');
    openAskOn('old line');
    expect(screen.getAllByLabelText('Ask about this line')).toHaveLength(1);
  });
});
