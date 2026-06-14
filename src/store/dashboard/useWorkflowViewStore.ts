import { create } from 'zustand';

/** The three ways to render a session's workflow. Add a value + a renderer entry to extend. */
export const WorkflowViewKind = { Timeline: 'timeline', Tree: 'tree', Board: 'board' } as const;
export type WorkflowViewKind = (typeof WorkflowViewKind)[keyof typeof WorkflowViewKind];

type WorkflowViewState = {
  view: WorkflowViewKind;
  setView: (view: WorkflowViewKind) => void;
};

export const useWorkflowViewStore = create<WorkflowViewState>((set) => ({
  view: WorkflowViewKind.Timeline,
  setView: (view) => set({ view }),
}));
