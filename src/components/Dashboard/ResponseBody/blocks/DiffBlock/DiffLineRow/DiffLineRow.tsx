import { MessageSquare } from 'lucide-react';

import { type DiffLine, LineKind } from '../diff.types';
import { DiffAskInput } from '../DiffAskInput/DiffAskInput';
import { DiffAskPopover } from '../DiffAskPopover/DiffAskPopover';
import { gutterLabel, gutterStyle, lineStyleByKind } from '../lineStyle';
import { AskPhase } from '../useDiffAsk';

export type DiffLineRowProps = {
  line: DiffLine;
  /** The ask phase for THIS line (Idle when another/no line is active). */
  askPhase: AskPhase;
  /** The answer markdown for this line (only set in the Answered phase). */
  answer: string;
  /** Open the inline ask input under this line. */
  onAsk: (lineId: string) => void;
  /** Submit the typed question for the open line. */
  onSubmit: (question: string) => void;
  /** Close/dismiss the ask for this line. */
  onClose: () => void;
};

export function DiffLineRow({
  line,
  askPhase,
  answer,
  onAsk,
  onSubmit,
  onClose,
}: DiffLineRowProps) {
  const style = lineStyleByKind[line.kind];

  // A hunk separator (`@@ … @@`) is a structural marker, not editable content:
  // render it as a full-width muted monospace band with no gutter numbers and no
  // Ask-Claude affordance.
  if (line.kind === LineKind.Hunk) {
    return (
      <pre
        className="overflow-x-auto whitespace-pre px-3 py-px text-xs leading-relaxed"
        style={{
          background: style.background,
          color: style.color,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {line.text}
      </pre>
    );
  }

  return (
    <div className="group/row">
      <div
        className="flex items-start text-xs leading-relaxed"
        style={{ background: style.background, fontFamily: 'var(--font-mono)' }}
      >
        <button
          type="button"
          onClick={() => onAsk(line.id)}
          title="Ask Claude about this line"
          aria-label="Ask Claude about this line"
          className="flex w-5 shrink-0 items-center justify-center self-stretch opacity-0 transition-opacity group-hover/row:opacity-100"
          style={{ color: 'var(--color-accent)' }}
        >
          <MessageSquare size={12} />
        </button>
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
      {askPhase === AskPhase.Prompting ? (
        <DiffAskInput onSubmit={onSubmit} onCancel={onClose} />
      ) : null}
      {askPhase === AskPhase.Loading || askPhase === AskPhase.Answered ? (
        <DiffAskPopover phase={askPhase} answer={answer} onDismiss={onClose} />
      ) : null}
    </div>
  );
}
