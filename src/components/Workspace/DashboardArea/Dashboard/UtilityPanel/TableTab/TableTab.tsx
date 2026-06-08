import { ThemeProvider } from '@mui/material/styles';
import { DataGrid, type GridColDef, type GridRowModel } from '@mui/x-data-grid';
import { useCallback } from 'react';

import { muiTheme } from '@/components/ResponseBody/blocks/TableBlock/muiTheme';
import {
  type PanelTab,
  PanelTabKind,
  type TablePayload,
  type TableRow,
  usePanelStore,
} from '@/store/usePanelStore';

import { PromptBar } from '../PromptBar/PromptBar';
import { buildMarkdown } from './exporters';
import { parseMarkdownTable } from './parseMarkdownTable';
import { TableToolbar } from './TableToolbar/TableToolbar';

const EMPTY_TABLE: TablePayload = { columns: [], rows: [] };

export function TableTab({ tab }: { tab: PanelTab }) {
  const commitRow = usePanelStore((s) => s.commitRow);
  const updateTab = usePanelStore((s) => s.updateTab);
  // Read the LIVE payload from the store (not the render-time prop) so the grid,
  // the export toolbar, and processRowUpdate always see the latest edits.
  const livePayload = usePanelStore((s) => {
    const found = s.tabs.find((t) => t.id === tab.id);
    return found?.kind === PanelTabKind.Table ? found.payload : null;
  });
  // TAB_BODY only routes table tabs here; the prop fallback keeps narrowing sound.
  const fallback = tab.kind === PanelTabKind.Table ? tab.payload : EMPTY_TABLE;
  const payload = livePayload ?? fallback;
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

  // Apply a one-shot transform result: the model returns a markdown table, which
  // we re-parse into rows/cols and replace the tab payload with. A malformed
  // result (no parseable table) is ignored so the current grid is never blanked.
  const applyTransform = useCallback(
    (markdown: string) => {
      const next = parseMarkdownTable(markdown);
      if (next) updateTab(tab.id, { kind: PanelTabKind.Table, payload: next });
    },
    [updateTab, tab.id],
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
            onProcessRowUpdateError={(error: unknown) => {
              // MUI requires this alongside processRowUpdate: without it a failed
              // commit is swallowed by warnOnce and the cell silently snaps back.
              // processRowUpdate can't throw today, but surface it if it ever does.
              console.error('TableTab: row update failed', error);
            }}
            sx={{ border: 0, height: '100%', fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>
      </ThemeProvider>
      <PromptBar kind={PanelTabKind.Table} content={buildMarkdown(payload)} apply={applyTransform} />
    </div>
  );
}
