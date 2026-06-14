import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AttachMenu } from '@/components/AgentChat/AgentChatInput/AttachMenu/AttachMenu';
import { FilePickerKind } from '@/lib/types';

// Radix DropdownMenu uses pointer capture (absent in jsdom). Open via the
// keyboard path: focus the trigger and press Enter (mirrors ContextMenu tests).
function openMenu() {
  const trigger = screen.getByRole('button', { name: 'Attach file' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'Enter' });
}

describe('AttachMenu', () => {
  it('opens a dropdown rather than directly attaching', () => {
    const onAttach = vi.fn();
    render(<AttachMenu onAttach={onAttach} />);

    // The trigger alone never fires onAttach — it only opens the menu.
    openMenu();
    expect(onAttach).not.toHaveBeenCalled();
  });

  it('offers Upload file and Upload image items', async () => {
    render(<AttachMenu onAttach={vi.fn()} />);
    openMenu();

    expect(await screen.findByText('Upload file')).toBeInTheDocument();
    expect(await screen.findByText('Upload image')).toBeInTheDocument();
  });

  it('attaches an unfiltered picker when Upload file is chosen', async () => {
    const onAttach = vi.fn();
    render(<AttachMenu onAttach={onAttach} />);
    openMenu();

    fireEvent.click(await screen.findByText('Upload file'));

    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(FilePickerKind.All));
  });

  it('attaches an image-scoped picker when Upload image is chosen', async () => {
    const onAttach = vi.fn();
    render(<AttachMenu onAttach={onAttach} />);
    openMenu();

    fireEvent.click(await screen.findByText('Upload image'));

    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(FilePickerKind.Image));
  });
});
