import { render, screen } from '@testing-library/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { blockComponents } from '@/components/Dashboard/ResponseBody/blockRegistry';

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
    // Syntax-highlighted: source is split across token spans, assert textContent.
    expect(document.querySelector('code')?.textContent).toBe('const x = 1;');
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

  it('renders nothing for a valid cam-ask block (consumed by the picker)', () => {
    renderMd(
      '```cam-ask\n{"type":"choice","question":"Q","options":[{"label":"A","value":"a"}]}\n```'
    );
    expect(screen.queryByText(/"type":"choice"/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });

  it('falls back to CodeBlock for a malformed cam-ask block', () => {
    renderMd('```cam-ask\n{ not json\n```');
    expect(screen.getByText(/not json/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});
