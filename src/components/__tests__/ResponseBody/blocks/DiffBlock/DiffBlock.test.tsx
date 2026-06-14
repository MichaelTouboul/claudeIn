import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LineKind } from '@/components/ResponseBody/blocks/DiffBlock/diff.types';
import { DiffBlock } from '@/components/ResponseBody/blocks/DiffBlock/DiffBlock';

const diff = {
  filePath: '/repo/a.ts',
  lines: [
    { id: 'l0', kind: LineKind.Context, oldNo: 1, newNo: 1, text: 'keep' },
    { id: 'l1', kind: LineKind.Del, oldNo: 2, newNo: null, text: 'old line' },
    { id: 'l2', kind: LineKind.Add, oldNo: null, newNo: 2, text: 'new line' },
  ],
};

describe('DiffBlock', () => {
  it('renders the file path header and the tool badge', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    expect(screen.getByText('/repo/a.ts')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('renders added and removed line text', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    expect(screen.getByText('old line')).toBeInTheDocument();
    expect(screen.getByText('new line')).toBeInTheDocument();
    expect(screen.getByText('keep')).toBeInTheDocument();
  });

  it('exposes a Copy action', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});
