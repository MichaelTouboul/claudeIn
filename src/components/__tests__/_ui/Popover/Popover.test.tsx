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
});
