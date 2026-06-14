import { useRef, useState } from 'react';

import { PanelTabKind } from '@/store/dashboard/usePanelStore';

import { buildAskContext } from './askContext';
import type { DiffLine } from './diff.types';

/** The lifecycle of the single active ask-on-line (enum + behavior map elsewhere). */
export const AskPhase = {
  /** No ask open. */
  Idle: 'idle',
  /** Input is open, awaiting the user's question. */
  Prompting: 'prompting',
  /** Question submitted; the one-shot LLM is running. */
  Loading: 'loading',
  /** An answer is rendered. */
  Answered: 'answered',
} as const;
export type AskPhase = (typeof AskPhase)[keyof typeof AskPhase];

/** Local ask state — a single active ask is enough for v1. */
export type DiffAskState = {
  /** The line currently being asked about, or null when idle. */
  lineId: string | null;
  phase: AskPhase;
  /** The rendered answer markdown (only meaningful in the Answered phase). */
  answer: string;
};

const initial: DiffAskState = { lineId: null, phase: AskPhase.Idle, answer: '' };

export type DiffAskApi = {
  state: DiffAskState;
  /** Open the inline input under a line (or re-target it). */
  open: (lineId: string) => void;
  /** Close the ask entirely. */
  close: () => void;
  /** Submit a question about the currently-open line. */
  submit: (question: string) => Promise<void>;
};

/**
 * Owns the single active ask-on-line for a DiffBlock: which line is open, the
 * phase, and the answer. Submitting runs the existing one-shot `transform` IPC
 * (kind 'text') — no new backend channel. A rejecting/empty transform collapses
 * back to idle (same silent-failure contract as PromptBar).
 */
export function useDiffAsk(filePath: string, lines: DiffLine[]): DiffAskApi {
  const [state, setState] = useState<DiffAskState>(initial);
  // Read the latest lines at submit time without re-creating `submit`.
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const open = (lineId: string) =>
    setState({ lineId, phase: AskPhase.Prompting, answer: '' });

  const close = () => setState(initial);

  const submit = async (question: string) => {
    const trimmed = question.trim();
    const lineId = state.lineId;
    if (!trimmed || lineId === null) return;

    setState({ lineId, phase: AskPhase.Loading, answer: '' });
    const content = buildAskContext(filePath, linesRef.current, lineId);
    const instruction = `Answer this question about the marked diff line. Be concise.\n\nQuestion: ${trimmed}`;

    const result = await window.api
      .transform({ kind: PanelTabKind.Text, instruction, content })
      .catch(() => '');

    setState((prev) => {
      // The user closed or re-targeted while in flight — drop this stale result.
      if (prev.phase !== AskPhase.Loading || prev.lineId !== lineId) return prev;
      if (!result) return initial;
      return { lineId, phase: AskPhase.Answered, answer: result };
    });
  };

  return { state, open, close, submit };
}
