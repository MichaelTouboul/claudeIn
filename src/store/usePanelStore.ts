import { create } from 'zustand';

import type { TableColumn, TableRow } from '@/components/ResponseBody/blocks/TableBlock/parseTable';

/** Finite set of panel tab kinds. Widened in later phases (code, text, …). */
export const PanelTabKind = { Table: 'table' } as const;
export type PanelTabKind = (typeof PanelTabKind)[keyof typeof PanelTabKind];

export type TablePayload = { columns: TableColumn[]; rows: TableRow[] };

export type PanelTab = {
  /** Stable id used for dedup (see tableTabId). */
  id: string;
  kind: PanelTabKind;
  title: string;
  payload: TablePayload;
};

type PanelState = {
  isOpen: boolean;
  tabs: PanelTab[];
  activeTabId: string | null;
  /** Push a tab (or refocus if its id already exists) and open the panel. */
  openTab: (tab: PanelTab) => void;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  setOpen: (open: boolean) => void;
  togglePanel: () => void;
};

export const usePanelStore = create<PanelState>((set) => ({
  isOpen: false,
  tabs: [],
  activeTabId: null,
  openTab: (tab) =>
    set((s) => ({
      isOpen: true,
      activeTabId: tab.id,
      tabs: s.tabs.some((t) => t.id === tab.id) ? s.tabs : [...s.tabs, tab],
    })),
  closeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId =
        s.activeTabId === id ? (tabs.length > 0 ? tabs[tabs.length - 1].id : null) : s.activeTabId;
      return { tabs, activeTabId, isOpen: tabs.length > 0 ? s.isOpen : false };
    }),
  setActive: (id) => set({ activeTabId: id }),
  setOpen: (open) => set({ isOpen: open }),
  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
}));

/** Stable content hash (djb2) so re-opening the same table refocuses its tab. */
export function tableTabId(payload: TablePayload): string {
  const str = JSON.stringify({ c: payload.columns, r: payload.rows });
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return `table:${h >>> 0}`;
}
