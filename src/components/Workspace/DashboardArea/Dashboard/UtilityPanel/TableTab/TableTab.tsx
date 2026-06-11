import { ThemeProvider } from '@mui/material/styles';
import { DataGrid, type GridColDef, type GridRowModel } from '@mui/x-data-grid';
import { useCallback, useState } from 'react';

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
  const update = usePanelStore((s) => s.update);
  // Read the LIVE payload from the store (not the render-time prop) so the grid,
  // the export toolbar, and processRowUpdate always see the latest edits.
  const livePayload = usePanelStore((s) =>
    s.current?.kind === PanelTabKind.Table ? s.current.payload : null,
  );
  // TAB_BODY only routes table tabs here; the prop fallback keeps narrowing sound.
  const fallback = tab.kind === PanelTabKind.Table ? tab.payload : EMPTY_TABLE;
  const payload = livePayload ?? fallback;
  const { columns, rows } = payload;

  // While a transform is in flight the result (parsed from a markdown string
  // captured at submit time) will REPLACE the whole payload on arrival. Locking the
  // grid for that window prevents a committed cell edit from being silently dropped.
  const [isTransforming, setIsTransforming] = useState(false);

  const gridColumns: GridColDef[] = columns.map((c) => ({
    field: c.field,
    headerName: c.headerName,
    flex: 1,
    minWidth: 120,
    editable: !isTransforming,
  }));

  // Edits are ephemeral in-tab: commit the single edited row to the panel tab so
  // exports reflect it. commitRow reads live store state, so back-to-back edits
  // never clobber each other. The source chat response stays immutable.
  const processRowUpdate = useCallback(
    (newRow: GridRowModel): GridRowModel => {
      commitRow(newRow as TableRow);
      return newRow;
    },
    [commitRow],
  );

  // Apply a one-shot transform result: the model returns a markdown table, which
  // we re-parse into rows/cols and replace the tab payload with. A malformed
  // result (no parseable table) is ignored so the current grid is never blanked.
  const applyTransform = useCallback(
    (markdown: string) => {
      const next = parseMarkdownTable(markdown);
      if (next) update({ kind: PanelTabKind.Table, payload: next });
    },
    [update],
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
      <PromptBar
        kind={PanelTabKind.Table}
        content={buildMarkdown(payload)}
        apply={applyTransform}
        onRunningChange={setIsTransforming}
      />
    </div>
  );
}
