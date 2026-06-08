import { BlockShell } from '../../BlockShell/BlockShell';
import type { BlockAction } from '../../responseBody.types';
import type { FileDiff } from './diff.types';
import { DiffLineRow } from './DiffLineRow/DiffLineRow';
import { linesToText } from './lineStyle';

export type DiffBlockProps = {
  diff: FileDiff;
  /** Edit tool that produced this diff, shown as a badge. */
  toolName: string;
};

export function DiffBlock({ diff, toolName }: DiffBlockProps) {
  const copy: BlockAction = {
    id: 'copy',
    label: 'Copy',
    kind: 'local',
    run: () => void navigator.clipboard?.writeText(linesToText(diff.lines)),
  };

  return (
    <BlockShell>
      {(register) => {
        register([copy]);
        return (
          <div>
            <div
              className="flex items-center gap-2 px-3 py-2 text-xs"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <span
                className="rounded px-1.5 py-0.5 font-medium"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)' }}
              >
                {toolName}
              </span>
              <span
                className="truncate"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}
                title={diff.filePath}
              >
                {diff.filePath}
              </span>
            </div>
            <div className="py-1">
              {diff.lines.map((line) => (
                <DiffLineRow key={line.id} line={line} />
              ))}
            </div>
          </div>
        );
      }}
    </BlockShell>
  );
}
