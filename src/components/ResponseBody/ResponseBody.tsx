import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { blockComponents } from './blockRegistry';

export type ResponseBodyProps = { content: string };

export function ResponseBody({ content }: ResponseBodyProps) {
  return (
    <div className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
      <Markdown remarkPlugins={[remarkGfm]} components={blockComponents}>
        {content}
      </Markdown>
    </div>
  );
}
