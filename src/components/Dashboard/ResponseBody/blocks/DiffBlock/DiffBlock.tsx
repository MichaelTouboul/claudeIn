import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { BlockShell } from '../../BlockShell/BlockShell';
import type { BlockAction } from '../../responseBody.types';
import type { FileDiff } from './diff.types';
import { DiffLineRow } from './DiffLineRow/DiffLineRow';
import { linesToText } from './lineStyle';
import { AskPhase, useDiffAsk } from './useDiffAsk';

export type DiffBlockProps = {
  diff: FileDiff;
  /** Edit tool that produced this diff, shown as a badge. */
  toolName: string;
};

export function DiffBlock({ diff, toolName }: DiffBlockProps) {
  const ask = useDiffAsk(diff.filePath, diff.lines);
  // GitHub-style collapse: the diff body hides while the header stays visible.
  // Expanded is the authoritative state; default open.
  const [expanded, setExpanded] = useState(true);

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
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse diff' : 'Expand diff'}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              {expanded ? (
                <ChevronDown size={12} className="shrink-0 text-fg-subtle" />
              ) : (
                <ChevronRight size={12} className="shrink-0 text-fg-subtle" />
              )}
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
            </button>
            {expanded ? (
              <div className="py-1">
                {diff.lines.map((line) => {
                  const active = ask.state.lineId === line.id;
                  return (
                    <DiffLineRow
                      key={line.id}
                      line={line}
                      askPhase={active ? ask.state.phase : AskPhase.Idle}
                      answer={active ? ask.state.answer : ''}
                      onAsk={ask.open}
                      onSubmit={ask.submit}
                      onClose={ask.close}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      }}
    </BlockShell>
  );
}
