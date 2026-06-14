import { ThemeProvider } from '@mui/material/styles';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

import { PanelTabKind, tableTabId, usePanelStore } from '@/store/dashboard/usePanelStore';

import { BlockShell } from '../../BlockShell/BlockShell';
import type { BlockAction } from '../../responseBody.types';
import { muiTheme } from './muiTheme';
import { type HastNode, parseTableNode } from './parseTable';

/** Footer is noise for small tables; show it only once paging is plausible. */
const FOOTER_ROW_THRESHOLD = 10;
/** Cap the grid height so a long table scrolls instead of taking over the chat. */
const MAX_GRID_HEIGHT = 420;

export type TableBlockProps = { node: unknown; raw: string };

export function TableBlock({ node, raw }: TableBlockProps) {
  const { columns, rows } = parseTableNode(node as HastNode);
  const gridColumns: GridColDef[] = columns.map((c) => ({
    field: c.field,
    headerName: c.headerName,
    flex: 1,
    minWidth: 120,
  }));

  const openPanel = usePanelStore((s) => s.open);

  const open: BlockAction = {
    id: 'open',
    label: 'Open',
    kind: 'local',
    run: () =>
      openPanel({
        id: tableTabId({ columns, rows }),
        kind: PanelTabKind.Table,
        title: 'Table',
        payload: { columns, rows },
      }),
  };

  const copy: BlockAction = {
    id: 'copy',
    label: 'Copy',
    kind: 'local',
    run: () => void navigator.clipboard?.writeText(raw),
  };

  return (
    <BlockShell>
      {(register) => {
        register([open, copy]);
        return (
          <ThemeProvider theme={muiTheme}>
            <div className="p-2" style={{ maxHeight: MAX_GRID_HEIGHT, overflow: 'auto' }}>
              <DataGrid
                rows={rows}
                columns={gridColumns}
                autoHeight
                density="compact"
                hideFooter={rows.length <= FOOTER_ROW_THRESHOLD}
                disableRowSelectionOnClick
                sx={{ border: 0, fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>
          </ThemeProvider>
        );
      }}
    </BlockShell>
  );
}
