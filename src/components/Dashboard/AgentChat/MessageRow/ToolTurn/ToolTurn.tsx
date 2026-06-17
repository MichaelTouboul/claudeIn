import { renderContentWithImages } from '@/components/_ui/InlineImage';
import { DiffBlock } from '@/components/Dashboard/ResponseBody/blocks/DiffBlock/DiffBlock';
import { parseEditTool } from '@/components/Dashboard/ResponseBody/blocks/DiffBlock/parseEditTool';

import { CopyButton } from '../CopyButton';
import { MessageHeader } from '../MessageHeader/MessageHeader';
import { TurnAvatar, TurnKind } from '../TurnAvatar/TurnAvatar';

export type ToolTurnProps = {
  toolName?: string;
  content: string;
  time: string;
};

/** A tool turn: wrench avatar + "<tool> · HH:MM:SS" header + the tool output
 *  (an Edit renders as a diff; anything else as a scrollable raw blob). */
export function ToolTurn({ toolName, content, time }: ToolTurnProps) {
  const hasContent = content.trim().length > 0;
  const fileDiff = toolName ? parseEditTool(toolName, content) : null;
  // When a diff renders, DiffBlock's own Copy action (copies the diff text)
  // supersedes the outer raw-JSON copy button — suppress the latter.
  const showCopy = hasContent && fileDiff === null;
  return (
    <div className="group relative flex gap-3">
      <TurnAvatar kind={TurnKind.Tool} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MessageHeader
          name={toolName || 'Tool'}
          time={time}
          nameColor="var(--color-warning)"
        />
        {fileDiff && toolName ? (
          <DiffBlock diff={fileDiff} toolName={toolName} />
        ) : (
          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-fg-muted">
            {renderContentWithImages(content)}
          </pre>
        )}
        {showCopy ? <CopyButton text={content} className="mt-1" /> : null}
      </div>
    </div>
  );
}
