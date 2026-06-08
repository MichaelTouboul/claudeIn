import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type PanelTab, PanelTabKind, usePanelStore } from '@/store/usePanelStore';

import { TableTab } from './TableTab';

const tab: PanelTab = {
  id: 'table:1',
  kind: PanelTabKind.Table,
  title: 'People',
  payload: {
    columns: [{ field: 'name', headerName: 'Name' }],
    rows: [{ id: 0, name: 'Alice' }],
  },
};

beforeEach(() => {
  usePanelStore.setState({ isOpen: true, tabs: [tab], activeTabId: tab.id });
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
});
