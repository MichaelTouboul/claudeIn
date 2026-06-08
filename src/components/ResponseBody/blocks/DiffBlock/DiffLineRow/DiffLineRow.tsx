import type { DiffLine } from '../diff.types';
import { gutterLabel, gutterStyle, lineStyleByKind } from '../lineStyle';

export type DiffLineRowProps = { line: DiffLine };

export function DiffLineRow({ line }: DiffLineRowProps) {
  const style = lineStyleByKind[line.kind];
  return (
    <div
      className="flex items-start text-xs leading-relaxed"
      style={{ background: style.background, fontFamily: 'var(--font-mono)' }}
    >
      <span className="tabular-nums" style={gutterStyle()}>
        {gutterLabel(line.oldNo)}
      </span>
      <span className="tabular-nums" style={gutterStyle()}>
        {gutterLabel(line.newNo)}
      </span>
      <span className="select-none px-1" style={{ color: style.color }}>
        {style.sign}
      </span>
      <pre
        className="flex-1 overflow-x-auto whitespace-pre py-px pr-3"
        style={{ color: style.color, fontFamily: 'var(--font-mono)' }}
      >
        {line.text}
      </pre>
    </div>
  );
}
