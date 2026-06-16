import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CodeView } from '@/components/Dashboard/ResponseBody/blocks/codeHighlight/CodeView';

describe('CodeView', () => {
  it('renders the language header label', () => {
    render(<CodeView src="x = 1" lang="python" />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('renders a line-number gutter matching the line count', () => {
    const { container } = render(<CodeView src={'a\nb\nc'} lang="ts" />);
    const gutter = container.querySelector('div[aria-hidden]');
    expect(gutter?.querySelectorAll('span')).toHaveLength(3);
  });

  it('Copy emits the raw source, not the highlighted markup', () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    const src = 'const a = "<b>";';
    render(<CodeView src={src} lang="ts" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(src);
  });

  it('preserves the full source text across token spans', () => {
    const src = 'function f() { return 42; }';
    const { container } = render(<CodeView src={src} lang="ts" />);
    expect(container.querySelector('code')?.textContent).toBe(src);
  });
});
