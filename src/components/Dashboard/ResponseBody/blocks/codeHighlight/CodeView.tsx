import { Check, Copy } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { CodeLines } from './CodeLines';

export type CodeViewProps = {
  src: string;
  lang: string | null;
  /** Extra header buttons (e.g. Open-in-panel) rendered left of Copy. */
  headerExtra?: ReactNode;
};

/**
 * Design-system code surface shared by the chat `CodeBlock` and the panel
 * `CodeTab`: a header (language label + Copy) over a gutter + highlighted body.
 * Copy always emits the RAW `src` — highlighting never alters the copied text.
 */
export function CodeView({ src, lang, headerExtra }: CodeViewProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    void navigator.clipboard?.writeText(src);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div
      className="overflow-hidden rounded-lg"
      style={{ background: 'var(--color-surface-inset)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background: 'var(--color-surface-2)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span
          className="inline-flex items-center gap-1.5 text-xs"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}
        >
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: 'var(--color-accent)' }}
            aria-hidden
          />
          {lang ?? 'text'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {headerExtra}
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Copy"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            Copy
          </button>
        </div>
      </div>
      <CodeLines src={src} lang={lang} />
    </div>
  );
}
