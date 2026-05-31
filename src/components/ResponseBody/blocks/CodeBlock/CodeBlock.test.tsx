import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeBlock } from './CodeBlock';

describe('CodeBlock', () => {
  it('renders the code text and a Copy action', () => {
    render(<CodeBlock data={{ lang: 'ts', src: 'const x = 1;' }} raw="const x = 1;" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('shows the language label when present', () => {
    render(<CodeBlock data={{ lang: 'python', src: 'x = 1' }} raw="x = 1" />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });
});
