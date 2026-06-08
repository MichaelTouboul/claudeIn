import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type PanelTab,PanelTabKind } from '@/store/usePanelStore';

import { TableTab } from './TableTab';

const tab: PanelTab = {
  id: 'table:1',
  kind: PanelTabKind.Table,
  title: 'Table',
  payload: {
    columns: [{ field: 'name', headerName: 'Name' }],
    rows: [{ id: 0, name: 'Alice' }],
  },
};

describe('TableTab', () => {
  it('renders the column header and a cell value', () => {
    render(<TableTab tab={tab} />);
    expect(screen.getByText('Name')).not.toBeNull();
    expect(screen.getByText('Alice')).not.toBeNull();
  });
});
