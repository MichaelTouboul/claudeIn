import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import type { ConversationStep } from '@/lib/types';
import { ConversationStatus, useConversationStatusStore } from '@/store/dashboard/useConversationStatusStore';
import { type PanelTab, PanelTabKind } from '@/store/dashboard/usePanelStore';

import { type ActivityRow, buildActivityRows, StepGlyph } from './activityRows';

/** Finite render states of the workflow body, derived from the fetch result. */
const View = { Loading: 'loading', Empty: 'empty', Steps: 'steps' } as const;
type View = (typeof View)[keyof typeof View];

/** Poll cadence (ms) while the conversation is live — cheap transcript re-read. */
const LIVE_POLL_MS = 1500;

/**
 * The discussion-workflow panel body: the chronological tool-use steps of ONE
 * main conversation. Fetches `getConversationSteps` on mount (mirroring DiffTab),
 * re-fetches on a light interval ONLY while the conversation is live, and appends
 * a trailing "Thinking…" row when the live turn is running. Read-only, scrollable.
 */
export function ActivityTab({ tab }: { tab: PanelTab }) {
  const payload = tab.kind === PanelTabKind.Activity ? tab.payload : null;
  const claudeSessionId = payload?.claudeSessionId ?? null;
  const projectPath = payload?.projectPath ?? '';

  const [steps, setSteps] = useState<ConversationStep[] | null>(null);
  const status = useConversationStatusStore((s) =>
    claudeSessionId ? s.statuses[claudeSessionId] ?? ConversationStatus.Idle : ConversationStatus.Idle,
  );
  const live = status === ConversationStatus.Running;

  const load = useCallback(() => {
    if (!claudeSessionId || !projectPath) {
      setSteps([]);
      return;
    }
    void window.api
      .getConversationSteps(projectPath, claudeSessionId)
      .then((s) => setSteps(s))
      .catch(() => setSteps([]));
  }, [claudeSessionId, projectPath]);

  useEffect(() => {
    load();
  }, [load]);

  // Live refresh: poll only while the conversation is running; tear the timer down
  // the moment it settles so no permanent timer runs when idle.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(load, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [live, load]);

  if (tab.kind !== PanelTabKind.Activity) return null;

  const view = resolveView(steps);
  const rows = steps ? buildActivityRows(steps, live) : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-3 py-2 text-xs text-fg-subtle">
        this discussion
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 font-mono text-xs">
        {VIEW_BODY[view](rows, live)}
      </div>
    </div>
  );
}

function resolveView(steps: ConversationStep[] | null): View {
  if (steps === null) return View.Loading;
  if (steps.length === 0) return View.Empty;
  return View.Steps;
}

const VIEW_BODY: Record<View, (rows: ActivityRow[], live: boolean) => ReactNode> = {
  [View.Loading]: () => <Empty label="Loading…" />,
  [View.Empty]: (_rows, live) => (live ? <ThinkingRow /> : <Empty label="No steps yet" />),
  [View.Steps]: (rows, live) => <StepList rows={rows} live={live} />,
};

function StepList({ rows, live }: { rows: ActivityRow[]; live: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((row) => (
        <Row key={row.key} row={row} />
      ))}
      {live ? <ThinkingRow /> : null}
    </div>
  );
}

function Row({ row }: { row: ActivityRow }) {
  return (
    <div className="flex items-center gap-2 px-1 py-0.5">
      <GlyphIcon glyph={row.glyph} />
      <span className="text-accent shrink-0 w-12">{row.step.tool}</span>
      <span className="truncate text-fg-muted">{row.step.target ?? ''}</span>
    </div>
  );
}

const GLYPH_ICON: Record<StepGlyph, ReactNode> = {
  [StepGlyph.Done]: <Check size={12} className="text-[var(--color-active)]" aria-label="done" />,
  [StepGlyph.Current]: <ChevronRight size={12} className="text-accent" aria-label="current" />,
};

function GlyphIcon({ glyph }: { glyph: StepGlyph }) {
  return <span className="shrink-0">{GLYPH_ICON[glyph]}</span>;
}

function ThinkingRow() {
  return (
    <div className="flex items-center gap-2 px-1 py-0.5 text-fg-subtle">
      <Loader2 size={12} className="animate-spin shrink-0" />
      <span>Thinking…</span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center text-fg-subtle">{label}</div>;
}
