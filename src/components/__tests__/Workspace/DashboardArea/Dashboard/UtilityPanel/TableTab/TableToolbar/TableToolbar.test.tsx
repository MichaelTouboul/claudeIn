import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TableToolbar } from '@/components/Workspace/DashboardArea/Dashboard/UtilityPanel/TableTab/TableToolbar/TableToolbar';
import type { TablePayload } from '@/store/dashboard/usePanelStore';

const payload: TablePayload = {
  columns: [{ field: 'name', headerName: 'Name' }],
  rows: [{ id: 0, name: 'Alice' }],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TableToolbar', () => {
  it('Copy writes the current grid to the clipboard as markdown and shows "Copied"', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<TableToolbar payload={payload} title="People" />);

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('| Name |\n| --- |\n| Alice |'));
    await waitFor(() => expect(screen.getByRole('button', { name: /copied/i })).not.toBeNull());
  });

  it('surfaces a failure (not "Copied") when the clipboard rejects, without an unhandled rejection', async () => {
    const rejection = new DOMException('denied', 'NotAllowedError');
    const writeText = vi.fn().mockRejectedValue(rejection);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    render(<TableToolbar payload={payload} title="People" />);
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    // The failure is surfaced to the user, and the button never claims success.
    await waitFor(() => expect(screen.getByRole('button', { name: /failed/i })).not.toBeNull());
    expect(screen.queryByRole('button', { name: /copied/i })).toBeNull();

    // Give any pending microtasks a chance to flush before asserting no unhandled rejection.
    await new Promise((r) => setTimeout(r, 0));
    expect(unhandled).not.toHaveBeenCalledWith(rejection, expect.anything());
    process.off('unhandledRejection', unhandled);
  });
});
