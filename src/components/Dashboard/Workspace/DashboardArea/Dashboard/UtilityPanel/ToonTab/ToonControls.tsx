import { FileJson, RotateCcw, Table2 } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { Inline } from '@/components/_ui/Inline';
import { AttachmentFormat } from '@/lib/types';

/** The opposite send-format — a total map so the toggle never derives via a
 *  fallback chain. */
const OTHER_FORMAT: Record<AttachmentFormat, AttachmentFormat> = {
  [AttachmentFormat.Json]: AttachmentFormat.Toon,
  [AttachmentFormat.Toon]: AttachmentFormat.Json,
};

export type ToonControlsProps = {
  format: AttachmentFormat;
  /** True when no TOON encoding exists (toggle-to-TOON + re-convert disabled). */
  toonUnavailable: boolean;
  onToggleFormat: (next: AttachmentFormat) => void;
  onReconvert: () => void;
  onRevert: () => void;
};

/** Send-format toggle (JSON⇄TOON) + re-convert + revert for a TOON attachment. */
export function ToonControls({ format, toonUnavailable, onToggleFormat, onReconvert, onRevert }: ToonControlsProps) {
  const next = OTHER_FORMAT[format];
  const togglingToToon = next === AttachmentFormat.Toon;
  const toggleDisabled = togglingToToon && toonUnavailable;
  return (
    <Inline gap={2} justify="between">
      <Button
        intent="outline"
        size="sm"
        onClick={() => onToggleFormat(next)}
        disabled={toggleDisabled}
        title={`Send as ${next.toUpperCase()}`}
      >
        {togglingToToon ? <Table2 size={12} /> : <FileJson size={12} />}
        Send as {next.toUpperCase()}
      </Button>
      <Inline gap={1.5}>
        <Button intent="ghost" size="sm" onClick={onReconvert} disabled={toonUnavailable} title="Re-convert to TOON">
          <RotateCcw size={12} />
          Re-convert
        </Button>
        <Button intent="ghost" size="sm" onClick={onRevert} title="Revert edits to the original JSON">
          Revert
        </Button>
      </Inline>
    </Inline>
  );
}
