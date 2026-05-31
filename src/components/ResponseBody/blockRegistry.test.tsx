import { render, screen } from '@testing-library/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { blockComponents } from './blockRegistry';

function renderMd(src: string) {
  return render(
    <Markdown remarkPlugins={[remarkGfm]} components={blockComponents}>
      {src}
    </Markdown>
  );
}

describe('blockRegistry', () => {
  it('routes a fenced code block to CodeBlock (Copy action present)', () => {
    renderMd('```ts\nconst x = 1;\n```');
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('renders inline code without a Copy action', () => {
    renderMd('this is `inline` code');
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });

  it('routes a GFM table to TableBlock (MUI DataGrid)', () => {
    renderMd('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
