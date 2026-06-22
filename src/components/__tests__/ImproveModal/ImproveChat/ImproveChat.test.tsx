import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImproveChat } from '@/components/ImproveModal/ImproveChat/ImproveChat';
import type { ChatMessage } from '@/components/ImproveModal/types';

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

describe('ImproveChat recap rendering', () => {
  const recapText = [
    'Sounds good, here is the recap:',
    '',
    '```recap',
    'TITLE: Make the button pop',
    'DESCRIPTION: Increase contrast and add a hover glow.',
    'ACCEPTANCE:',
    '- Button uses the accent token',
    '- Hover state has a glow',
    '```',
  ].join('\n');

  it('renders an assistant recap message as a formatted card (no raw fence/labels)', () => {
    const messages: ChatMessage[] = [{ id: 'a1', role: 'assistant', text: recapText }];
    render(<ImproveChat messages={messages} loading={false} onSend={vi.fn()} />);

    // Card content is present…
    expect(screen.getByText('Make the button pop')).toBeInTheDocument();
    expect(screen.getByText('Button uses the accent token')).toBeInTheDocument();
    // …but the raw fence and field labels are NOT shown.
    expect(screen.queryByText(/```recap/)).toBeNull();
    expect(screen.queryByText(/TITLE:/)).toBeNull();
    expect(screen.queryByText(/ACCEPTANCE:/)).toBeNull();
    // The conversational preamble before the fence is still rendered.
    expect(screen.getByText('Sounds good, here is the recap:')).toBeInTheDocument();
  });

  it('renders a plain assistant message as text (no card)', () => {
    const messages: ChatMessage[] = [
      { id: 'a1', role: 'assistant', text: 'Could you tell me which button you mean?' },
    ];
    render(<ImproveChat messages={messages} loading={false} onSend={vi.fn()} />);

    expect(screen.getByText('Could you tell me which button you mean?')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('renders a user message verbatim, even if it happens to contain recap-like text', () => {
    const messages: ChatMessage[] = [{ id: 'u1', role: 'user', text: 'TITLE: this is mine' }];
    render(<ImproveChat messages={messages} loading={false} onSend={vi.fn()} />);

    expect(screen.getByText('TITLE: this is mine')).toBeInTheDocument();
  });
});
