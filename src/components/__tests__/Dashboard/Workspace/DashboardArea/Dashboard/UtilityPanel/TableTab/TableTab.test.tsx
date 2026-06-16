import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TableTab } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/TableTab/TableTab';
import { type PanelTab, PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';

const tab: PanelTab = {
  id: 'table:1',
  kind: PanelTabKind.Table,
  title: 'People',
  payload: {
    columns: [{ field: 'name', headerName: 'Name' }],
    rows: [{ id: 0, name: 'Alice' }],
  },
};

const multiRowTab: PanelTab = {
  id: 'table:2',
  kind: PanelTabKind.Table,
  title: 'People',
  payload: {
    columns: [{ field: 'name', headerName: 'Name' }],
    rows: [
      { id: 0, name: 'Alice' },
      { id: 1, name: 'Bob' },
    ],
  },
};

const statusTab: PanelTab = {
  id: 'table:3',
  kind: PanelTabKind.Table,
  title: 'Roadmap',
  payload: {
    columns: [
      { field: 'pillar', headerName: 'Pillar' },
      { field: 'status', headerName: 'Status' },
    ],
    rows: [{ id: 0, pillar: 'UX', status: 'done' }],
  },
};

beforeEach(() => {
  usePanelStore.setState({ isOpen: true, current: tab });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TableTab', () => {
  it('renders the column header and a cell value', () => {
    render(<TableTab tab={tab} />);
    expect(screen.getByText('Name')).not.toBeNull();
    expect(screen.getByText('Alice')).not.toBeNull();
  });

  it('exposes the export/copy toolbar', () => {
    render(<TableTab tab={tab} />);
    expect(screen.getByRole('button', { name: /excel/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /pdf/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /copy/i })).not.toBeNull();
  });

  it('Copy writes the current grid to the clipboard as markdown', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<TableTab tab={tab} />);
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('| Name |\n| --- |\n| Alice |'),
    );
  });

  it('reflects live store edits when exporting (reads payload from the store, not the prop)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<TableTab tab={tab} />);
    // Edit the row in the store after mount; Copy must reflect the NEW value.
    act(() => {
      usePanelStore.getState().update({
        kind: PanelTabKind.Table,
        payload: { columns: tab.payload.columns, rows: [{ id: 0, name: 'Renamed' }] },
      });
    });
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('| Name |\n| --- |\n| Renamed |'),
    );
  });

  it('locks the grid (cells non-editable) while a transform is running so edits cannot be overwritten', async () => {
    // A transform that never resolves keeps the bar in the running state.
    let resolve: ((v: string) => void) | undefined;
    const transformMock = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    window.api = { transform: transformMock } as unknown as typeof window.api;
    render(<TableTab tab={tab} />);

    // Cells start editable (MUI marks them with the `cell--editable` class).
    const cell = screen.getByText('Alice').closest('[role="gridcell"]');
    expect(cell?.className).toContain('MuiDataGrid-cell--editable');

    // Kick off a transform and leave it pending.
    fireEvent.change(screen.getByLabelText(/transform instruction/i), {
      target: { value: 'add a total column' },
    });
    fireEvent.submit(screen.getByLabelText(/transform instruction/i).closest('form')!);

    await waitFor(() => {
      const lockedCell = screen.getByText('Alice').closest('[role="gridcell"]');
      expect(lockedCell?.className).not.toContain('MuiDataGrid-cell--editable');
    });

    // Cleanup: resolve the pending transform.
    act(() => resolve?.(''));
  });

  it('editing a cell commits the row and the edit is reflected in the exported markdown (still editable after restyle)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<TableTab tab={tab} />);

    // The cell must still be editable after the styling change.
    const cell = screen.getByText('Alice').closest('[role="gridcell"]');
    expect(cell?.className).toContain('MuiDataGrid-cell--editable');

    // Simulate the DataGrid commit path (processRowUpdate → commitRow): the source
    // of truth is the store, which is what the exporter reads.
    act(() => {
      usePanelStore.getState().commitRow({ id: 0, name: 'Edited' });
    });

    // Copy must now reflect the committed edit — proving the edit→commit→export
    // data flow survived the restyle.
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('| Name |\n| --- |\n| Edited |'),
    );
  });

  it('renders a status cell as a badge (visual) without changing the cell value seen by exports', async () => {
    usePanelStore.setState({ isOpen: true, current: statusTab });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<TableTab tab={statusTab} />);

    // The badge shows the raw status text verbatim.
    expect(screen.getByText('done')).not.toBeNull();

    // The exported markdown still carries the raw status value (badge is display-only).
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        '| Pillar | Status |\n| --- | --- |\n| UX | done |',
      ),
    );
  });

  it('persists two back-to-back row edits without dropping the first (no stale closure)', () => {
    usePanelStore.setState({ isOpen: true, current: multiRowTab });
    render(<TableTab tab={multiRowTab} />);
    const { commitRow } = usePanelStore.getState();
    // Two sequential cell commits before any re-render flushes — each must read live state.
    commitRow({ id: 0, name: 'Alice2' });
    commitRow({ id: 1, name: 'Bob2' });
    const stored = usePanelStore.getState().current;
    if (stored?.kind !== PanelTabKind.Table) throw new Error('expected a table object');
    expect(stored.payload.rows).toEqual([
      { id: 0, name: 'Alice2' },
      { id: 1, name: 'Bob2' },
    ]);
  });
});
