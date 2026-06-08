import { ThemeProvider } from '@mui/material/styles';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

import { muiTheme } from '@/components/ResponseBody/blocks/TableBlock/muiTheme';
import type { PanelTab } from '@/store/usePanelStore';

export function TableTab({ tab }: { tab: PanelTab }) {
  const { columns, rows } = tab.payload;
  const gridColumns: GridColDef[] = columns.map((c) => ({
    field: c.field,
    headerName: c.headerName,
    flex: 1,
    minWidth: 120,
  }));

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="h-full p-2">
        <DataGrid
          rows={rows}
          columns={gridColumns}
          density="compact"
          disableRowSelectionOnClick
          sx={{ border: 0, height: '100%', fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>
    </ThemeProvider>
  );
}
