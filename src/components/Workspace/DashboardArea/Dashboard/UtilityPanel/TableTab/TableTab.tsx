import { ThemeProvider } from '@mui/material/styles';
import { DataGrid, type GridColDef, type GridRowModel } from '@mui/x-data-grid';
import { useCallback } from 'react';

import { muiTheme } from '@/components/ResponseBody/blocks/TableBlock/muiTheme';
import { type PanelTab, type TableRow, usePanelStore } from '@/store/usePanelStore';

import { TableToolbar } from './TableToolbar/TableToolbar';

export function TableTab({ tab }: { tab: PanelTab }) {
  const updateTab = usePanelStore((s) => s.updateTab);
  const { columns, rows } = tab.payload;

  const gridColumns: GridColDef[] = columns.map((c) => ({
    field: c.field,
    headerName: c.headerName,
    flex: 1,
    minWidth: 120,
    editable: true,
  }));

  // Edits are ephemeral in-tab: persist the new row set on the panel tab so the
  // grid stays consistent and exports reflect it. The source response is untouched.
  const processRowUpdate = useCallback(
    (newRow: GridRowModel): GridRowModel => {
      const updated = newRow as TableRow;
      const nextRows = rows.map((r) => (r.id === updated.id ? updated : r));
      updateTab(tab.id, { payload: { columns, rows: nextRows } });
      return newRow;
    },
    [columns, rows, tab.id, updateTab],
  );

  return (
    <div className="flex h-full flex-col">
      <TableToolbar payload={tab.payload} title={tab.title} />
      <ThemeProvider theme={muiTheme}>
        <div className="min-h-0 flex-1 p-2">
          <DataGrid
            rows={rows}
            columns={gridColumns}
            density="compact"
            disableRowSelectionOnClick
            processRowUpdate={processRowUpdate}
            sx={{ border: 0, height: '100%', fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>
      </ThemeProvider>
    </div>
  );
}
