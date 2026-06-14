import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND } from 'lexical';
import { Bold, Code, List, ListOrdered } from 'lucide-react';

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const btn = 'rounded p-1 hover:opacity-100 opacity-60 transition-opacity';
  const style = { color: 'var(--color-text-secondary)' };
  return (
    <div className="flex gap-0.5">
      <button
        type="button"
        className={btn}
        style={style}
        title="Bold"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
      >
        <Bold size={14} />
      </button>
      <button
        type="button"
        className={btn}
        style={style}
        title="Inline code"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
      >
        <Code size={14} />
      </button>
      <button
        type="button"
        className={btn}
        style={style}
        title="Bullet list"
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
      >
        <List size={14} />
      </button>
      <button
        type="button"
        className={btn}
        style={style}
        title="Numbered list"
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
      >
        <ListOrdered size={14} />
      </button>
    </div>
  );
}
