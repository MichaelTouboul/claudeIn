import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('renders the title and children when open', () => {
    render(
      <Drawer open onClose={() => {}} title="Background tasks">
        <div>drawer body</div>
      </Drawer>,
    );
    expect(screen.getByText('Background tasks')).not.toBeNull();
    expect(screen.getByText('drawer body')).not.toBeNull();
  });

  it('hides its content when closed', () => {
    render(
      <Drawer open={false} onClose={() => {}} title="Background tasks">
        <div>drawer body</div>
      </Drawer>,
    );
    expect(screen.queryByText('drawer body')).toBeNull();
    expect(screen.queryByText('Background tasks')).toBeNull();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Background tasks">
        <div>drawer body</div>
      </Drawer>,
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exposes an accessible, keyboard-operable close button', () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Background tasks">
        <div>drawer body</div>
      </Drawer>,
    );
    const closeButton = screen.getByRole('button', { name: /close/i });
    // Native <button> is inherently keyboard-operable (Enter/Space -> click).
    expect(closeButton.tagName).toBe('BUTTON');
    closeButton.focus();
    expect(document.activeElement).toBe(closeButton);
  });
});
