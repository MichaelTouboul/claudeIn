import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImproveModal } from '@/components/ImproveModal/ImproveModal';
import type { ImproveChatInput, ImproveRequestInput } from '@/lib/types';
import { useImproveModalStore } from '@/store/useImproveModalStore';

const improveChat = vi.fn<(input: ImproveChatInput) => Promise<string>>();
const submitImproveRequest = vi.fn<(input: ImproveRequestInput) => Promise<unknown>>();

beforeEach(() => {
  useImproveModalStore.setState({ open: false, target: null });
  improveChat.mockReset().mockResolvedValue('Which button is hard to see?');
  submitImproveRequest.mockReset().mockResolvedValue({ id: 'r1' });
  window.api = { improveChat, submitImproveRequest } as unknown as Window['api'];
});

function openWith(target: { component?: string; sourcePath?: string } | null) {
  useImproveModalStore.setState({ open: true, target });
}

describe('ImproveModal', () => {
  it('renders nothing when the store is closed', () => {
    render(<ImproveModal />);
    expect(screen.queryByLabelText('Improvement type')).toBeNull();
  });

  it('renders the modal with the captured component target when open', () => {
    openWith({ component: 'AgentChatInput', sourcePath: 'src/x.tsx:1' });
    render(<ImproveModal />);
    expect(screen.getByLabelText('Improvement type')).toBeInTheDocument();
    expect(screen.getByText('AgentChatInput')).toBeInTheDocument();
  });

  it('shows "General request" when target is null', () => {
    openWith(null);
    render(<ImproveModal />);
    expect(screen.getByText('General request')).toBeInTheDocument();
  });

  it('a chat turn calls improve:chat and appends the assistant reply', async () => {
    openWith(null);
    render(<ImproveModal />);

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'the send button is hard to see' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(improveChat).toHaveBeenCalledTimes(1));
    expect(improveChat).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'feature',
        transcript: [{ role: 'user', text: 'the send button is hard to see' }],
      }),
    );
    expect(await screen.findByText('Which button is hard to see?')).toBeInTheDocument();
  });

  it('changing the type dropdown updates the request type sent to improve:chat', async () => {
    openWith(null);
    render(<ImproveModal />);

    fireEvent.change(screen.getByLabelText('Improvement type'), { target: { value: 'bug' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'it crashes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(improveChat).toHaveBeenCalledTimes(1));
    expect(improveChat).toHaveBeenCalledWith(expect.objectContaining({ type: 'bug' }));
  });

  it('"Send to Claude" submits a well-formed ImproveRequest then closes', async () => {
    improveChat.mockResolvedValue(
      ['Title: Brighten the send button', 'Description: use the accent color'].join('\n'),
    );
    openWith({ component: 'AgentChatInput', sourcePath: 'src/x.tsx:1' });
    render(<ImproveModal />);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'send button dim' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText(/Brighten the send button/);

    fireEvent.click(screen.getByRole('button', { name: 'Send to Claude' }));

    await waitFor(() => expect(submitImproveRequest).toHaveBeenCalledTimes(1));
    expect(submitImproveRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'feature',
        component: 'AgentChatInput',
        sourcePath: 'src/x.tsx:1',
        title: 'Brighten the send button',
      }),
    );
    const arg = submitImproveRequest.mock.calls[0][0];
    expect(arg.transcript?.length).toBe(2);
    await waitFor(() => expect(useImproveModalStore.getState().open).toBe(false));
  });

  it('defaults the target picker to the first non-_ui ancestor and submits it', async () => {
    improveChat.mockResolvedValue(['Title: Fix it', 'Description: do the thing'].join('\n'));
    useImproveModalStore.setState({
      open: true,
      target: {
        component: 'Button',
        sourcePath: 'src/components/_ui/Button/Button.tsx:9',
        chain: [
          { component: 'Button', sourcePath: 'src/components/_ui/Button/Button.tsx:9' },
          { component: 'AgentChat', sourcePath: 'src/components/Dashboard/AgentChat.tsx:3' },
        ],
      },
    });
    render(<ImproveModal />);

    // Smart default selected the feature component, not the _ui primitive.
    const select = screen.getByLabelText('Target component') as HTMLSelectElement;
    expect(select.value).toBe('1');

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'broken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText(/Fix it/);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Claude' }));

    await waitFor(() => expect(submitImproveRequest).toHaveBeenCalledTimes(1));
    expect(submitImproveRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        component: 'AgentChat',
        sourcePath: 'src/components/Dashboard/AgentChat.tsx:3',
      }),
    );
  });

  it('the "None / I\'ll describe" escape hatch submits without a component', async () => {
    improveChat.mockResolvedValue(['Title: General', 'Description: somewhere'].join('\n'));
    openWith({ component: 'AgentChatInput', sourcePath: 'src/x.tsx:1' });
    render(<ImproveModal />);

    fireEvent.change(screen.getByLabelText('Target component'), { target: { value: '__none__' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'general thing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText(/General/);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Claude' }));

    await waitFor(() => expect(submitImproveRequest).toHaveBeenCalledTimes(1));
    const arg = submitImproveRequest.mock.calls[0][0];
    expect('component' in arg).toBe(false);
    expect('sourcePath' in arg).toBe(false);
  });

  it('"Send to Claude" is disabled until at least one user message exists', () => {
    openWith(null);
    render(<ImproveModal />);
    expect(screen.getByRole('button', { name: 'Send to Claude' })).toBeDisabled();
  });

  it('Cancel closes the modal via the store', () => {
    openWith(null);
    render(<ImproveModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(useImproveModalStore.getState().open).toBe(false);
  });
});
