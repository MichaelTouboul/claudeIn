import { Clipboard, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/_ui/Button';
import type { TablePayload } from '@/store/usePanelStore';

import { copyMarkdown, triggerPdf, triggerXlsx } from '../exporters';

type TableToolbarProps = {
  /** The CURRENT (possibly edited) grid content to export/copy. */
  payload: TablePayload;
  /** Tab title — seeds the export filename and the PDF heading. */
  title: string;
};

/** Outcome of the last copy attempt — drives the Copy button label. */
const CopyState = { Idle: 'idle', Copied: 'copied', Failed: 'failed' } as const;
type CopyState = (typeof CopyState)[keyof typeof CopyState];

const COPY_LABEL: Record<CopyState, string> = {
  [CopyState.Idle]: 'Copy',
  [CopyState.Copied]: 'Copied',
  [CopyState.Failed]: 'Failed',
};

/** Deterministic actions over the current grid: export Excel / PDF, copy markdown. */
export function TableToolbar({ payload, title }: TableToolbarProps) {
  const [copyState, setCopyState] = useState<CopyState>(CopyState.Idle);

  // `navigator.clipboard.writeText` can reject (permission denied, non-secure
  // context, Electron restrictions). React does not catch rejections from async
  // event handlers, so we must catch here — otherwise the failure becomes an
  // unhandled rejection and the user gets no feedback at all.
  const onCopy = async () => {
    try {
      await copyMarkdown(payload);
      setCopyState(CopyState.Copied);
    } catch {
      setCopyState(CopyState.Failed);
    }
    window.setTimeout(() => setCopyState(CopyState.Idle), 1500);
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <Button intent="outline" size="sm" onClick={() => triggerXlsx(payload, title)}>
        <FileSpreadsheet size={13} />
        Excel
      </Button>
      <Button intent="outline" size="sm" onClick={() => triggerPdf(payload, title)}>
        <FileText size={13} />
        PDF
      </Button>
      <Button intent="outline" size="sm" onClick={onCopy}>
        <Clipboard size={13} />
        {COPY_LABEL[copyState]}
      </Button>
    </div>
  );
}
