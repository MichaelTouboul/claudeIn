import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImproveChat } from '@/components/ImproveModal/ImproveChat/ImproveChat';

const openFilePicker = vi.fn<(kind?: string) => Promise<string[]>>();
const readImageAsDataUrl = vi.fn<(p: string) => Promise<string | null>>();

beforeEach(() => {
  openFilePicker.mockReset().mockResolvedValue([]);
  readImageAsDataUrl.mockReset().mockResolvedValue('data:image/png;base64,AAA');
  window.api = { openFilePicker, readImageAsDataUrl } as unknown as Window['api'];
});

describe('ImproveChat composer', () => {
  it('plain Enter submits the draft and clears it', () => {
    const onSend = vi.fn();
    render(<ImproveChat messages={[]} loading={false} onSend={onSend} />);

    const box = screen.getByLabelText('Message') as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'make it pop' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('make it pop', undefined);
    expect(box.value).toBe('');
  });

  it('Shift+Enter does NOT submit (inserts a newline instead)', () => {
    const onSend = vi.fn();
    render(<ImproveChat messages={[]} loading={false} onSend={onSend} />);

    const box = screen.getByLabelText('Message');
    fireEvent.change(box, { target: { value: 'line one' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('the Send button submits the form', () => {
    const onSend = vi.fn();
    render(<ImproveChat messages={[]} loading={false} onSend={onSend} />);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith('hello', undefined);
  });

  it('attaching an image shows a thumbnail; removing it clears the thumbnail', async () => {
    openFilePicker.mockResolvedValue(['/tmp/shot.png']);
    render(<ImproveChat messages={[]} loading={false} onSend={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Attach image' }));

    const thumb = await screen.findByAltText('shot.png');
    expect(thumb).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove attachment' }));
    await waitFor(() => expect(screen.queryByAltText('shot.png')).toBeNull());
  });

  it('sends the attached image paths along with the text', async () => {
    const onSend = vi.fn();
    openFilePicker.mockResolvedValue(['/tmp/shot.png']);
    render(<ImproveChat messages={[]} loading={false} onSend={onSend} />);

    fireEvent.click(screen.getByRole('button', { name: 'Attach image' }));
    await screen.findByAltText('shot.png');

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'match this' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith('match this', ['/tmp/shot.png']);
  });
});
