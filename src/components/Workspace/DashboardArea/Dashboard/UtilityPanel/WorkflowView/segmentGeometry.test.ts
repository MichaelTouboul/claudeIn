import { describe, expect, it } from 'vitest';

import type { WorkflowSegment } from '@/hooks/useSessionWorkflow';

import { placeSegment, runTimeRange, toolColorVar } from './segmentGeometry';

const seg = (startMs: number, endMs: number, tool: string | null = 'Read'): WorkflowSegment => ({
  tool,
  startMs,
  endMs,
});

describe('runTimeRange', () => {
  it('returns the min start and max end across all segments', () => {
    const range = runTimeRange([[seg(100, 200)], [seg(50, 80), seg(80, 300)]]);
    expect(range).toEqual({ minMs: 50, maxMs: 300 });
  });

  it('falls back to a zero-width range when there are no segments', () => {
    const range = runTimeRange([]);
    expect(range.minMs).toBe(range.maxMs);
  });
});

describe('placeSegment', () => {
  it('positions a segment as a left/width percentage of the run span', () => {
    const range = { minMs: 0, maxMs: 100 };
    const placed = placeSegment(seg(25, 75), range);
    expect(placed.leftPct).toBeCloseTo(25);
    expect(placed.widthPct).toBeCloseTo(50);
  });

  it('clamps a zero-span run to a full-width segment (no divide-by-zero)', () => {
    const range = { minMs: 200, maxMs: 200 };
    const placed = placeSegment(seg(200, 200), range);
    expect(placed.leftPct).toBe(0);
    expect(placed.widthPct).toBe(100);
  });

  it('gives a zero-duration segment a small non-zero width so it stays visible', () => {
    const range = { minMs: 0, maxMs: 100 };
    const placed = placeSegment(seg(50, 50), range);
    expect(placed.widthPct).toBeGreaterThan(0);
  });
});

describe('toolColorVar', () => {
  it('returns a design-system CSS var', () => {
    expect(toolColorVar('Read')).toMatch(/^var\(--/);
  });

  it('is stable for the same tool and differs for different tools', () => {
    expect(toolColorVar('Read')).toBe(toolColorVar('Read'));
    expect(toolColorVar('Read')).not.toBe(toolColorVar('Edit'));
  });

  it('maps a null tool (no tool) to a muted color', () => {
    expect(toolColorVar(null)).toBe('var(--color-text-muted)');
  });
});
