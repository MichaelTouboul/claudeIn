import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResponseBody } from './ResponseBody';

describe('ResponseBody', () => {
  it('renders markdown content (heading + table + code) as structured elements', () => {
    const content = '# Title\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```';
    render(<ResponseBody content={content} />);
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });
});
