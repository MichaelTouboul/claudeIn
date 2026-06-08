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
    set((s) => {
      const existing = s.tabs.find((t) => t.id === tab.id);
      if (existing) {
        // Same id AND same content → refocus the existing tab (true dedup).
        if (samePayload(existing.payload, tab.payload)) {
          return { isOpen: true, activeTabId: existing.id, tabs: s.tabs };
        }
        // Same id but DIFFERENT content (hash collision). Aliasing here would
        // show the wrong table, so mint a fresh, guaranteed-unique id instead.
        const uniqueTab = { ...tab, id: uniqueId(tab.id, s.tabs) };
        return { isOpen: true, activeTabId: uniqueTab.id, tabs: [...s.tabs, uniqueTab] };
      }
      return { isOpen: true, activeTabId: tab.id, tabs: [...s.tabs, tab] };
    }),
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

/** Canonical string form of a payload — the single source for hashing & equality. */
function serializePayload(payload: TablePayload): string {
  return JSON.stringify({ c: payload.columns, r: payload.rows });
}

/**
 * Content-derived tab id (djb2 hash) so re-opening the *same* table refocuses
 * its tab. The hash is only a fast dedup hint — it is NOT collision-proof, so
 * `openTab` verifies payload equality before treating two ids as the same tab
 * and mints a fresh id on a genuine collision. Distinct content is therefore
 * never silently aliased to the wrong tab.
 */
export function tableTabId(payload: TablePayload): string {
  const str = serializePayload(payload);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return `table:${h >>> 0}`;
}

/** True when two payloads carry identical content (for collision disambiguation). */
function samePayload(a: TablePayload, b: TablePayload): boolean {
  return serializePayload(a) === serializePayload(b);
}

/** Derive an id that is guaranteed not to clash with any existing tab id. */
function uniqueId(base: string, tabs: PanelTab[]): string {
  const taken = new Set(tabs.map((t) => t.id));
  let candidate = base;
  for (let n = 2; taken.has(candidate); n++) candidate = `${base}#${n}`;
  return candidate;
}
