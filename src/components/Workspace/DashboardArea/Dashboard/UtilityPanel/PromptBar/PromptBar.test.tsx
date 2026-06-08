import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PanelTabKind } from '@/store/usePanelStore';

import { PromptBar } from './PromptBar';

const transformMock = vi.fn<(input: unknown) => Promise<string>>();

window.api = { transform: transformMock } as unknown as typeof window.api;

afterEach(() => {
  transformMock.mockReset();
});

describe('PromptBar', () => {
  it('calls window.api.transform with kind, instruction and current content on submit', async () => {
    transformMock.mockResolvedValue('result text');
    const apply = vi.fn();
    render(
      <PromptBar kind={PanelTabKind.Text} content="hello world" apply={apply} />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'make it formal' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    await waitFor(() =>
      expect(transformMock).toHaveBeenCalledWith({
        kind: PanelTabKind.Text,
        instruction: 'make it formal',
        content: 'hello world',
      }),
    );
  });

  it('applies the transform result via the apply callback', async () => {
    transformMock.mockResolvedValue('transformed!');
    const apply = vi.fn();
    render(<PromptBar kind={PanelTabKind.Code} content="x" apply={apply} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'rename' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    await waitFor(() => expect(apply).toHaveBeenCalledWith('transformed!'));
  });

  it('clears the input after a successful apply', async () => {
    transformMock.mockResolvedValue('done');
    render(<PromptBar kind={PanelTabKind.Text} content="c" apply={vi.fn()} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'do it' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(input.value).toBe(''));
  });

  it('does not call transform when the instruction is empty', () => {
    const apply = vi.fn();
    render(<PromptBar kind={PanelTabKind.Text} content="c" apply={apply} />);

    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    expect(transformMock).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  it('clears the input on Escape', () => {
    render(<PromptBar kind={PanelTabKind.Text} content="c" apply={vi.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'typing…' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
  });

  it('does not call apply when the transform returns an empty string (failure)', async () => {
    transformMock.mockResolvedValue('');
    const apply = vi.fn();
    render(<PromptBar kind={PanelTabKind.Text} content="c" apply={apply} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'go' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    await waitFor(() => expect(transformMock).toHaveBeenCalled());
    expect(apply).not.toHaveBeenCalled();
  });

  it('swallows an IPC rejection without applying and re-enables the input', async () => {
    // A rejecting transform (Electron serialisation error, sync throw in the
    // handler, …) must NOT become an unhandled rejection: the bar treats it as a
    // silent no-op (apply untouched) and the input becomes usable again.
    transformMock.mockRejectedValue(new Error('ipc blew up'));
    const apply = vi.fn();
    render(<PromptBar kind={PanelTabKind.Text} content="c" apply={apply} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'go' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(transformMock).toHaveBeenCalled());
    expect(apply).not.toHaveBeenCalled();
    // finally re-enabled the field so the user can retry.
    await waitFor(() => expect(input.disabled).toBe(false));
  });
});
