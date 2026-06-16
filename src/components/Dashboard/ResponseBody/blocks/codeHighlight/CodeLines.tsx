import { useMemo } from 'react';

import { highlight } from './highlight';
import { TOKEN_COLOR } from './tokenTheme';

/**
 * Highlighted code body: a non-selectable line-number gutter aligned to a
 * syntax-highlighted, horizontally-scrollable code column. Pure presentation —
 * the highlighting is display-only; callers always copy/transform the raw `src`.
 */
export function CodeLines({ src, lang }: { src: string; lang: string | null }) {
  const lines = useMemo(() => highlight(src, lang), [src, lang]);

  return (
    <div
      className="flex overflow-x-auto text-sm leading-relaxed"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <div
        aria-hidden
        className="shrink-0 select-none py-3 text-right"
        style={{
          color: 'var(--color-text-muted)',
          opacity: 0.6,
          borderRight: '1px solid var(--color-border-subtle)',
        }}
      >
        {lines.map((_, i) => (
          <span key={`gutter-${i + 1}`} className="block px-3">
            {i + 1}
          </span>
        ))}
      </div>
      <pre className="m-0 whitespace-pre px-4 py-3" style={{ color: 'var(--color-text-primary)' }}>
        <code>
          {lines.map((tokens, i) => (
            <span key={`line-${i + 1}`} className="block min-h-[1.5em]">
              {tokens.map((tok, j) => (
                <span
                  key={`tok-${j + 1}-${tok.type}-${tok.text}`}
                  style={{ color: TOKEN_COLOR[tok.type] }}
                >
                  {tok.text}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
