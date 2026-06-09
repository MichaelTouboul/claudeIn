import type { WorkflowSegment } from '@/hooks/useSessionWorkflow';

/** The wall-clock span of the whole run, in ms, used to normalize every lane. */
export type RunTimeRange = { minMs: number; maxMs: number };

/** A segment placed as percentages of the run span (CSS left/width on a lane). */
export type PlacedSegment = { leftPct: number; widthPct: number };

// A zero-duration span would be invisible; give it this minimum width (% of run)
// so a single-event tool-use still shows up as a sliver on the lane.
const MIN_WIDTH_PCT = 1.5;

/**
 * Min start and max end across every agent's segments — the run's overall time
 * window that each lane is normalized against. With no segments the range is
 * zero-width (min === max); callers treat that as "place everything full-width".
 */
export function runTimeRange(segmentsPerAgent: WorkflowSegment[][]): RunTimeRange {
  let minMs = Infinity;
  let maxMs = -Infinity;
  for (const segments of segmentsPerAgent) {
    for (const segment of segments) {
      if (segment.startMs < minMs) minMs = segment.startMs;
      if (segment.endMs > maxMs) maxMs = segment.endMs;
    }
  }
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) return { minMs: 0, maxMs: 0 };
  return { minMs, maxMs };
}

/**
 * Place one segment on a lane as a left/width percentage of the run span. A
 * zero-span run (single instant, or no spread) collapses to a full-width segment
 * so the lane isn't blank; a zero-duration segment gets a {@link MIN_WIDTH_PCT}
 * sliver so it stays visible. Asserting these percentages (not pixels) keeps the
 * Timeline tests deterministic.
 */
export function placeSegment(segment: WorkflowSegment, range: RunTimeRange): PlacedSegment {
  const span = range.maxMs - range.minMs;
  if (span <= 0) return { leftPct: 0, widthPct: 100 };

  const leftPct = ((segment.startMs - range.minMs) / span) * 100;
  const rawWidthPct = ((segment.endMs - segment.startMs) / span) * 100;
  const widthPct = rawWidthPct > MIN_WIDTH_PCT ? rawWidthPct : MIN_WIDTH_PCT;
  return { leftPct, widthPct };
}

// A small palette of design-system color vars cycled through per distinct tool, so
// each tool gets a stable, distinguishable lane color without hardcoding hexes.
const TOOL_PALETTE: string[] = [
  'var(--color-accent)',
  'var(--color-active)',
  'var(--color-danger)',
  'var(--color-text-secondary)',
  'var(--color-text-primary)',
];

/**
 * Stable color var for a tool's timeline segment: a null tool (idle gap) is muted;
 * a named tool is hashed (djb2-style) onto {@link TOOL_PALETTE} so the same tool
 * always gets the same color and different tools differ. Design-system vars only —
 * no hardcoded colors (src/CLAUDE.md).
 */
export function toolColorVar(tool: string | null): string {
  if (tool === null) return 'var(--color-text-muted)';
  let hash = 5381;
  for (let i = 0; i < tool.length; i += 1) hash = (hash * 37 + tool.charCodeAt(i)) >>> 0;
  return TOOL_PALETTE[hash % TOOL_PALETTE.length];
}
