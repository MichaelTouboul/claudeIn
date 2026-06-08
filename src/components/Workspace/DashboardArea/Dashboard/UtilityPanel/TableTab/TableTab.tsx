import { ThemeProvider } from '@mui/material/styles';
import { DataGrid, type GridColDef, type GridRowModel } from '@mui/x-data-grid';
import { useCallback } from 'react';

import { muiTheme } from '@/components/ResponseBody/blocks/TableBlock/muiTheme';
import { type PanelTab, type TableRow, usePanelStore } from '@/store/usePanelStore';

import { TableToolbar } from './TableToolbar/TableToolbar';

export function TableTab({ tab }: { tab: PanelTab }) {
  const commitRow = usePanelStore((s) => s.commitRow);
  // Read the LIVE payload from the store (not the render-time prop) so the grid,
  // the export toolbar, and processRowUpdate always see the latest edits.
  const payload = usePanelStore((s) => s.tabs.find((t) => t.id === tab.id)?.payload) ?? tab.payload;
  const { columns, rows } = payload;

  const gridColumns: GridColDef[] = columns.map((c) => ({
    field: c.field,
    headerName: c.headerName,
    flex: 1,
    minWidth: 120,
    editable: true,
  }));

  // Edits are ephemeral in-tab: commit the single edited row to the panel tab so
  // exports reflect it. commitRow reads live store state, so back-to-back edits
  // never clobber each other. The source chat response stays immutable.
  const processRowUpdate = useCallback(
    (newRow: GridRowModel): GridRowModel => {
      commitRow(tab.id, newRow as TableRow);
      return newRow;
    },
    [commitRow, tab.id],
  );

  return (
    <div className="flex h-full flex-col">
      <TableToolbar payload={payload} title={tab.title} />
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
