import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { PanelTabKind, usePanelStore } from '@/store/usePanelStore';

import { UtilityPanel } from './UtilityPanel';

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, tabs: [], activeTabId: null });
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
});
