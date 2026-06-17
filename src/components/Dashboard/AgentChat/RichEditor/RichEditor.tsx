import { ListItemNode, ListNode } from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { $getRoot, $getSelection, $isRangeSelection, $isTextNode, type LexicalEditor } from 'lexical';
import { type Ref, useEffect, useImperativeHandle } from 'react';

import { CHAT_TRANSFORMERS } from './markdownTransformers';
import { PastePlugin } from './plugins/PastePlugin';
import { type HistoryNavContext, SUBMIT_INTENT, SubmitPlugin } from './plugins/SubmitPlugin';
import { editorToMarkdown } from './serialize';
import { Toolbar } from './Toolbar';

export type RichEditorHandle = {
  clear: () => void;
  focus: () => void;
  /** Replace the trailing `@token` at the caret with `@name ` (mention insertion). */
  insertMention: (name: string) => void;
  /** Replace the leading `/token` with `/cmd ` — completes the command text WITHOUT
   *  launching it, leaving the caret after the trailing space for args. */
  insertSlashCommand: (cmd: string) => void;
};

export type RichEditorProps = {
  onChange: (markdown: string, plainText: string) => void;
  onSubmit: () => void;
  /** Returns true if Enter was consumed by the slash/mention menu (select + submit). */
  onEnter: () => boolean;
  /** Returns true if Tab was consumed by an open menu (complete the text only). */
  onComplete: () => boolean;
  /** Returns true if an ↑/↓/Esc key was consumed by an open menu. */
  onNavKey: (key: string) => boolean;
  /** Prompt-history navigation for an unconsumed ↑/↓ (menu closed): returns the text
   *  to load into the editor, or null to let the arrow move the caret normally. */
  onHistoryNav: (key: 'ArrowUp' | 'ArrowDown', ctx: HistoryNavContext) => string | null;
  /** Intercepts a plain-text paste BEFORE it is inserted. Returning `true` claims
   *  the paste — Lexical's default insert is prevented (used for substantial-JSON
   *  paste → TOON attachment). Returning `false`/undefined lets the paste proceed. */
  onPasteText?: (text: string) => boolean;
  handleRef: Ref<RichEditorHandle>;
  placeholder: string;
};

function SubmitBridge({ onSubmit }: { onSubmit: () => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        SUBMIT_INTENT,
        () => {
          onSubmit();
          return true;
        },
        0
      ),
    [editor, onSubmit]
  );
  return null;
}

function HandlePlugin({ handleRef }: { handleRef: Ref<RichEditorHandle> }) {
  const [editor] = useLexicalComposerContext();
  useImperativeHandle(
    handleRef,
    () => ({
      clear: () => editor.update(() => $getRoot().clear()),
      focus: () => editor.focus(),
      insertMention: (name: string) =>
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
          const node = selection.anchor.getNode();
          if (!$isTextNode(node)) return;
          const text = node.getTextContent();
          const offset = selection.anchor.offset;
          // Find the `@` that opens the token the caret sits in.
          const at = text.slice(0, offset).lastIndexOf('@');
          if (at < 0) return;
          selection.setTextNodeRange(node, at, node, offset);
          selection.insertText(`@${name} `);
        }),
      insertSlashCommand: (cmd: string) =>
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
          const node = selection.anchor.getNode();
          if (!$isTextNode(node)) return;
          const text = node.getTextContent();
          // The slash token is the whole bare `/word` (see `matchSlashQuery`); replace
          // it in place with `/cmd ` so the caret lands after the space, ready for args.
          const at = text.indexOf('/');
          if (at < 0) return;
          selection.setTextNodeRange(node, at, node, text.length);
          selection.insertText(`${cmd} `);
        }),
    }),
    [editor]
  );
  return null;
}

export function RichEditor({ onChange, onSubmit, onEnter, onComplete, onNavKey, onHistoryNav, onPasteText, handleRef, placeholder }: RichEditorProps) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'chat',
        nodes: [ListNode, ListItemNode],
        onError: (e: Error) => {
          throw e;
        },
        theme: {},
      }}
    >
      <div className="flex-1">
        <Toolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="text-sm font-mono leading-relaxed focus:outline-none min-h-[24px] max-h-[120px] overflow-y-auto"
                style={{ color: 'var(--color-text-primary)' }}
                aria-placeholder={placeholder}
                placeholder={
                  <div
                    className="pointer-events-none absolute left-0 top-0 text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {placeholder}
                  </div>
                }
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <ListPlugin />
        <HistoryPlugin />
        <MarkdownShortcutPlugin transformers={CHAT_TRANSFORMERS} />
        <SubmitPlugin onEnter={onEnter} onComplete={onComplete} onNavKey={onNavKey} onHistoryNav={onHistoryNav} />
        <PastePlugin onPasteText={onPasteText} />
        <SubmitBridge onSubmit={onSubmit} />
        <HandlePlugin handleRef={handleRef} />
        <OnChangePlugin
          onChange={(_state, editor: LexicalEditor) => {
            const markdown = editorToMarkdown(editor);
            const plain = editor.getEditorState().read(() => $getRoot().getTextContent());
            onChange(markdown, plain);
          }}
        />
      </div>
    </LexicalComposer>
  );
}
