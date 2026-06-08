import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PanelTabKind, usePanelStore } from '@/store/usePanelStore';

import { UtilityPanel } from './UtilityPanel';

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, tabs: [], activeTabId: null });
});

afterEach(() => {
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

describe('UtilityPanel', () => {
  it('is not rendered when the panel is closed', () => {
    render(<UtilityPanel />);
    expect(screen.queryByText('Table')).toBeNull();
  });

  it('renders the active table tab when open', () => {
    usePanelStore.setState({
      isOpen: true,
      activeTabId: 't1',
      tabs: [
        {
          id: 't1',
          kind: PanelTabKind.Table,
          title: 'Table',
          payload: { columns: [{ field: 'name', headerName: 'Name' }], rows: [{ id: 0, name: 'Alice' }] },
        },
      ],
    });
    render(<UtilityPanel />);
    expect(screen.getByText('Alice')).not.toBeNull();
  });

  it('clears the drag body styles when the panel closes mid-drag', () => {
    usePanelStore.setState({
      isOpen: true,
      activeTabId: 't1',
      tabs: [{ id: 't1', kind: PanelTabKind.Table, title: 'Table', payload: { columns: [], rows: [] } }],
    });
    render(<UtilityPanel />);

    // Begin a drag: the body picks up the resize cursor + text-select lock.
    fireEvent.mouseDown(screen.getByRole('separator', { name: 'Resize panel' }));
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    // Close the panel mid-drag (e.g. the X button) — the content unmounts.
    act(() => usePanelStore.setState({ isOpen: false }));
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });
});
