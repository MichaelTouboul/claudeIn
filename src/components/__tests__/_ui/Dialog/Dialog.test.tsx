import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from '@/components/_ui/Dialog/Dialog';

describe('Dialog', () => {
  it('renders children only when open', () => {
    const { rerender } = render(
      <Dialog open={false} onOpenChange={() => {}} title="Test">
        <div>panel body</div>
      </Dialog>,
    );
    expect(screen.queryByText('panel body')).toBeNull();

    rerender(
      <Dialog open onOpenChange={() => {}} title="Test">
        <div>panel body</div>
      </Dialog>,
    );
    expect(screen.getByText('panel body')).not.toBeNull();
  });

  it('exposes an accessible name via the title prop', () => {
    render(
      <Dialog open onOpenChange={() => {}} title="My Dialog">
        <div>panel body</div>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'My Dialog' })).not.toBeNull();
  });

  it('calls onOpenChange(false) on Escape', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Test">
        <div>panel body</div>
      </Dialog>,
    );
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('anchors the panel to the right edge in the drawer-right variant', () => {
    render(
      <Dialog open onOpenChange={() => {}} variant="drawer-right" title="My profile">
        <div>drawer body</div>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'My profile' });
    // the drawer variant pins the panel to the right edge, full height
    expect(dialog).toHaveClass('right-0', 'h-full');
    expect(screen.getByText('drawer body')).toBeInTheDocument();
  });

  it('still closes the drawer on Escape', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} variant="drawer-right" title="Test">
        <div>drawer body</div>
      </Dialog>,
    );
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
