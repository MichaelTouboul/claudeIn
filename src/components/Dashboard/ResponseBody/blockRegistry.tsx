import { type ComponentPropsWithoutRef } from 'react';
import type { Components } from 'react-markdown';

import { CAM_ASK_LANG, isValidAskJson } from '@/components/Dashboard/AgentChat/askPrompt';

import { CodeBlock } from './blocks/CodeBlock/CodeBlock';
import { TableBlock } from './blocks/TableBlock/TableBlock';

/** Detect a fenced block-code's language from react-markdown's `language-xxx` className. */
function langFromClassName(className: string | undefined): string | null {
  const match = /language-([\w-]+)/.exec(className ?? '');
  return match ? match[1] : null;
}

function Code({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) {
  const lang = langFromClassName(className);
  const src = String(children ?? '').replace(/\n$/, '');
  // Inline code has no language class and no newline → render plainly.
  const isInline = lang === null && !src.includes('\n');
  if (isInline) {
    return (
      <code
        className="rounded px-1 py-0.5 text-sm"
        style={{ background: 'var(--color-surface-3)', fontFamily: 'var(--font-mono)' }}
        {...props}
      >
        {children}
      </code>
    );
  }
  // A valid cam-ask block is metadata consumed by the AskPrompt picker, not inline content.
  // A malformed one falls through to a visible CodeBlock for debugging.
  if (lang === CAM_ASK_LANG && isValidAskJson(src)) {
    return null;
  }
  return <CodeBlock data={{ lang, src }} raw={src} />;
}

/** The open markdown-level registry. To add a block type, add an entry here. */
export const blockComponents: Components = {
  code: Code,
  // CodeBlock renders its own <pre>; unwrap react-markdown's wrapper to avoid <pre><pre>.
  pre: ({ children }: ComponentPropsWithoutRef<'pre'>) => <>{children}</>,
  // TableBlock parses the hast `node` itself → no thead/tbody/tr/td overrides needed.
  table: ({ node }) => <TableBlock node={node} raw="" />,
  // img/etc. fall back to react-markdown defaults until their rich blocks land.
};
