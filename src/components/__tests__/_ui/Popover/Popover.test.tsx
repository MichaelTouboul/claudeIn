import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Popover } from '@/components/_ui/Popover/Popover';

describe('Popover', () => {
  it('hides content until the trigger is clicked', () => {
    render(
      <Popover trigger={<button>open</button>}>
        <div>panel content</div>
      </Popover>,
    );
    expect(screen.queryByText('panel content')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByText('panel content')).not.toBeNull();
  });

  it('closes on Escape', () => {
    render(
      <Popover trigger={<button>open</button>}>
        <div>panel content</div>
      </Popover>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByText('panel content')).not.toBeNull();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByText('panel content')).toBeNull();
  });

  // The Content is portalled to <body>, so its own z-index — not its DOM
  // position — decides what paints over it. App-root overlays (the fixed
  // top-right notification bar that mounts ImproveNotification) sit at z-60, so
  // a Content at z-50 opens but renders *behind* that overlay and is never
  // seen. The popover layer must out-stack app overlays.
  it('stacks its content above app-overlay chrome (z >= 60)', () => {
    render(
      <Popover trigger={<button>open</button>}>
        <div>panel content</div>
      </Popover>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'open' }));

    const content = screen.getByText('panel content').closest('[class*="z-"]');
    const zClass = content?.className.match(/z-(?:\[(\d+)\]|(\d+))/);
    const zValue = Number(zClass?.[1] ?? zClass?.[2] ?? 0);
    expect(zValue).toBeGreaterThanOrEqual(60);
  });
});
