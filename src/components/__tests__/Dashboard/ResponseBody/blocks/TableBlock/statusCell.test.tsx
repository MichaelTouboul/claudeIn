import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { matchStatus, StatusCell } from '@/components/Dashboard/ResponseBody/blocks/TableBlock/statusCell';

describe('matchStatus', () => {
  it('maps keyword statuses to a badge variant + label, preserving the raw text', () => {
    expect(matchStatus('done')).toEqual({ variant: 'green', label: 'done' });
    expect(matchStatus('WIP')).toEqual({ variant: 'yellow', label: 'WIP' });
    expect(matchStatus('planned')).toEqual({ variant: 'gray', label: 'planned' });
  });

  it('maps emoji statuses to a badge variant, keeping the raw emoji as the label', () => {
    expect(matchStatus('✅')).toEqual({ variant: 'green', label: '✅' });
    expect(matchStatus('🚧 En cours')).toEqual({ variant: 'yellow', label: '🚧 En cours' });
    expect(matchStatus('📋 Prévu')).toEqual({ variant: 'gray', label: '📋 Prévu' });
  });

  it('returns null for non-status text so the plain value is rendered', () => {
    expect(matchStatus('Alice')).toBeNull();
    expect(matchStatus('')).toBeNull();
    expect(matchStatus('42')).toBeNull();
  });
});

describe('StatusCell', () => {
  it('renders a badge for a status value WITHOUT altering the underlying text', () => {
    render(<StatusCell value="done" />);
    // The badge shows the original value verbatim (exports still see "done").
    expect(screen.getByText('done')).not.toBeNull();
  });

  it('falls back to plain text for a non-status value', () => {
    render(<StatusCell value="Alice" />);
    const el = screen.getByText('Alice');
    // No badge wrapper: the value is rendered as a bare text node.
    expect(el.tagName.toLowerCase()).not.toBe('span');
  });
});
