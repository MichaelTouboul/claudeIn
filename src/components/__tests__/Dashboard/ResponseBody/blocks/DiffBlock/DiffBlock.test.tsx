import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LineKind } from '@/components/Dashboard/ResponseBody/blocks/DiffBlock/diff.types';
import { DiffBlock } from '@/components/Dashboard/ResponseBody/blocks/DiffBlock/DiffBlock';

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

  it('is expanded by default with the toggle reflecting that state', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    const toggle = screen.getByRole('button', { name: /collapse diff/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('old line')).toBeInTheDocument();
  });

  it('collapses the diff lines when the header toggle is clicked', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    fireEvent.click(screen.getByRole('button', { name: /collapse diff/i }));

    const toggle = screen.getByRole('button', { name: /expand diff/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('old line')).not.toBeInTheDocument();
    expect(screen.queryByText('new line')).not.toBeInTheDocument();
    // Header content stays visible while collapsed.
    expect(screen.getByText('/repo/a.ts')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('re-expands the diff lines on a second click', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    const header = screen.getByRole('button', { name: /collapse diff/i });
    fireEvent.click(header);
    fireEvent.click(screen.getByRole('button', { name: /expand diff/i }));
    expect(screen.getByText('old line')).toBeInTheDocument();
  });

  it('keeps the Copy action working while expanded', () => {
    render(<DiffBlock diff={diff} toolName="Edit" />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByText('old line')).toBeInTheDocument();
  });

  it('renders a hunk separator without line numbers or ask button', () => {
    const hunkDiff = {
      filePath: 'a.ts',
      lines: [
        { id: 'h', kind: LineKind.Hunk, oldNo: null, newNo: null, text: '@@ -1,2 +1,2 @@' },
      ],
    };
    render(<DiffBlock diff={hunkDiff} toolName="Diff" />);
    expect(screen.getByText('@@ -1,2 +1,2 @@')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ask claude about this line/i }),
    ).not.toBeInTheDocument();
  });
});
