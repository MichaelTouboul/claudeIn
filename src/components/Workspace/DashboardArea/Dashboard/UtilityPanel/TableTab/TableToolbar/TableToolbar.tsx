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

/** Deterministic actions over the current grid: export Excel / PDF, copy markdown. */
export function TableToolbar({ payload, title }: TableToolbarProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await copyMarkdown(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
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
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}
