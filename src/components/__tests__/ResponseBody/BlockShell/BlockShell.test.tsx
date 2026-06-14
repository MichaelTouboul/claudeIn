import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BlockShell } from '@/components/ResponseBody/BlockShell/BlockShell';
import type { BlockAction } from '@/components/ResponseBody/responseBody.types';

describe('BlockShell', () => {
  it('renders children and a button per registered action; clicking a local action runs it', () => {
    const run = vi.fn();
    const actions: BlockAction[] = [{ id: 'copy', label: 'Copy', kind: 'local', run }];

    function Consumer() {
      return (
        <BlockShell>
          {(register) => {
            register(actions);
            return <div>body</div>;
          }}
        </BlockShell>
      );
    }

    render(<Consumer />);
    expect(screen.getByText('body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(run).toHaveBeenCalledOnce();
  });

  it('renders claude actions as disabled (deferred)', () => {
    const actions: BlockAction[] = [
      { id: 'tr', label: 'Translate', kind: 'claude', prompt: (r) => r },
    ];
    render(
      <BlockShell>
        {(register) => {
          register(actions);
          return <div>body</div>;
        }}
      </BlockShell>
    );
    expect(screen.getByRole('button', { name: 'Translate' })).toBeDisabled();
  });
});
