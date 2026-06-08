import { create } from 'zustand';

import type { TableColumn, TableRow } from '@/components/ResponseBody/blocks/TableBlock/parseTable';
import { contentHash } from '@/lib/contentHash';

export type { TableColumn, TableRow };

/** Finite set of panel tab kinds. Add a value here + an entry in TAB_BODY to extend the panel. */
export const PanelTabKind = { Table: 'table', Code: 'code', Text: 'text' } as const;
export type PanelTabKind = (typeof PanelTabKind)[keyof typeof PanelTabKind];

export type TablePayload = { columns: TableColumn[]; rows: TableRow[] };
export type CodePayload = { lang: string | null; src: string };
export type TextPayload = { text: string };

/** A panel tab — discriminated by `kind`, so `payload` is narrowed per kind. */
export type PanelTab =
  | { id: string; kind: typeof PanelTabKind.Table; title: string; payload: TablePayload }
  | { id: string; kind: typeof PanelTabKind.Code; title: string; payload: CodePayload }
  | { id: string; kind: typeof PanelTabKind.Text; title: string; payload: TextPayload };

type PanelState = {
  isOpen: boolean;
  tabs: PanelTab[];
  activeTabId: string | null;
  /** Push a tab (or refocus if its id already exists) and open the panel. */
  openTab: (tab: PanelTab) => void;
  closeTab: (id: string) => void;
  /** Patch an existing tab in place (e.g. ephemeral table edits). No-op if absent. */
  updateTab: (id: string, patch: Partial<Omit<PanelTab, 'id' | 'kind'>>) => void;
  /**
   * Replace a single row (matched by `id`) in a table tab's payload, reading the
   * LIVE tab state inside the set updater so back-to-back edits never lose data
   * (no stale render-time closure). No-op if the tab is absent or not a table.
   */
  commitRow: (id: string, row: TableRow) => void;
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
        if (samePayload(existing, tab)) {
          return { isOpen: true, activeTabId: existing.id, tabs: s.tabs };
        }
        // Same id but DIFFERENT content (hash collision). Aliasing here would
        // show the wrong content, so mint a fresh, guaranteed-unique id instead.
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
  updateTab: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? ({ ...t, ...patch } as PanelTab) : t)),
    })),
  commitRow: (id, row) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id || t.kind !== PanelTabKind.Table) return t;
        const rows = t.payload.rows.map((r) => (r.id === row.id ? row : r));
        return { ...t, payload: { ...t.payload, rows } };
      }),
    })),
  setActive: (id) => set({ activeTabId: id }),
  setOpen: (open) => set({ isOpen: open }),
  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
}));

/** Canonical string form of a tab's payload — the single source for hashing & equality. */
function serializePayload(tab: PanelTab): string {
  return JSON.stringify(tab.payload);
}

/**
 * Content-derived tab ids (djb2 hash) so re-opening the *same* content refocuses
 * its tab. The hash is only a fast dedup hint — it is NOT collision-proof, so
 * `openTab` verifies payload equality before treating two ids as the same tab
 * and mints a fresh id on a genuine collision. Distinct content is therefore
 * never silently aliased to the wrong tab.
 */
export function tableTabId(payload: TablePayload): string {
  return `table:${contentHash(JSON.stringify({ c: payload.columns, r: payload.rows }))}`;
}

export function codeTabId(payload: CodePayload): string {
  return `code:${contentHash(JSON.stringify(payload))}`;
}

export function textTabId(payload: TextPayload): string {
  return `text:${contentHash(payload.text)}`;
}

/** True when two tabs carry identical payload content (for collision disambiguation). */
function samePayload(a: PanelTab, b: PanelTab): boolean {
  return a.kind === b.kind && serializePayload(a) === serializePayload(b);
}

/** Derive an id that is guaranteed not to clash with any existing tab id. */
function uniqueId(base: string, tabs: PanelTab[]): string {
  const taken = new Set(tabs.map((t) => t.id));
  let candidate = base;
  for (let n = 2; taken.has(candidate); n++) candidate = `${base}#${n}`;
  return candidate;
}
