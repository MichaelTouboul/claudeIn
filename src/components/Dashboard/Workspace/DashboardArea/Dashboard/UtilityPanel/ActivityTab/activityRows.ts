import type { ConversationStep } from '@/lib/types';

/**
 * Finite per-step glyph states. `Done` = a completed step (✓); `Current` = the
 * latest step while the conversation is still live (▸). One authoritative state
 * per row, mapped to a glyph — no fallback chain.
 */
export const StepGlyph = {
  Done: 'done',
  Current: 'current',
} as const;
export type StepGlyph = (typeof StepGlyph)[keyof typeof StepGlyph];

export type ActivityRow = {
  /** Stable key: index + tool + ts (steps have no natural id). */
  key: string;
  step: ConversationStep;
  glyph: StepGlyph;
};

/**
 * Build the rows for the workflow list. When `live` is true the LAST step is
 * marked `Current` (▸) — the in-flight step — and every earlier one `Done` (✓);
 * when not live every step is `Done`.
 */
export function buildActivityRows(steps: ConversationStep[], live: boolean): ActivityRow[] {
  const lastIndex = steps.length - 1;
  return steps.map((step, i) => ({
    key: `${i}:${step.tool}:${step.ts}`,
    step,
    glyph: live && i === lastIndex ? StepGlyph.Current : StepGlyph.Done,
  }));
}
