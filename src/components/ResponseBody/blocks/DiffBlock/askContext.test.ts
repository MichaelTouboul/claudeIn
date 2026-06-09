import { describe, expect, it } from 'vitest';

import { buildAskContext } from './askContext';
import { type DiffLine, LineKind } from './diff.types';

const lines: DiffLine[] = [
  { id: 'l0', kind: LineKind.Context, oldNo: 1, newNo: 1, text: 'alpha' },
  { id: 'l1', kind: LineKind.Context, oldNo: 2, newNo: 2, text: 'beta' },
  { id: 'l2', kind: LineKind.Del, oldNo: 3, newNo: null, text: 'gamma-old' },
  { id: 'l3', kind: LineKind.Add, oldNo: null, newNo: 3, text: 'gamma-new' },
  { id: 'l4', kind: LineKind.Context, oldNo: 4, newNo: 4, text: 'delta' },
  { id: 'l5', kind: LineKind.Context, oldNo: 5, newNo: 5, text: 'epsilon' },
  { id: 'l6', kind: LineKind.Context, oldNo: 6, newNo: 6, text: 'sixth' },
  { id: 'l7', kind: LineKind.Context, oldNo: 7, newNo: 7, text: 'seventh' },
];

describe('buildAskContext', () => {
  it('includes the file path', () => {
    expect(buildAskContext('/repo/a.ts', lines, 'l3')).toContain('File: /repo/a.ts');
  });

  it('marks the target line and renders its diff sign', () => {
    const ctx = buildAskContext('/repo/a.ts', lines, 'l3');
    expect(ctx).toContain('+gamma-new  ◀── this line');
  });

  it('includes a few surrounding lines but not the whole file', () => {
    // target l3 (index 3): radius 3 ⇒ window is l0..l6 (slice end exclusive).
    const ctx = buildAskContext('/repo/a.ts', lines, 'l3');
    expect(ctx).toContain('beta');
    expect(ctx).toContain('delta');
    expect(ctx).toContain('sixth');
    // seventh (index 7) is past the radius window of l3.
    expect(ctx).not.toContain('seventh');
  });

  it('falls back to just the file path for an unknown target id', () => {
    expect(buildAskContext('/repo/a.ts', lines, 'nope')).toBe('File: /repo/a.ts');
  });
});
