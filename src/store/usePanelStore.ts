import { create } from 'zustand';

import type { TableColumn, TableRow } from '@/components/ResponseBody/blocks/TableBlock/parseTable';
import { contentHash } from '@/lib/contentHash';

export type { TableColumn, TableRow };

/** Finite set of panel tab kinds. Add a value here + an entry in TAB_BODY to extend the panel. */
export const PanelTabKind = {
  Table: 'table',
  Code: 'code',
  Text: 'text',
  Agent: 'agent',
  Workflow: 'workflow',
} as const;
export type PanelTabKind = (typeof PanelTabKind)[keyof typeof PanelTabKind];

export type TablePayload = { columns: TableColumn[]; rows: TableRow[] };
export type CodePayload = { lang: string | null; src: string };
export type TextPayload = { text: string };
/**
 * A live sub-agent activity view. Unlike the other payloads, its content is NOT
 * snapshot into the tab: the body reads live status/tool/context/events from
 * `useEventsStore` keyed by `agentName` (+ `claudeSessionId` to scope the stream).
 */
export type AgentPayload = { agentName: string; claudeSessionId: string | null };
/**
 * A live session-overview view. Like {@link AgentPayload} it carries no snapshot —
 * the body reads live status/tool/events from `useEventsStore`, scoped by
 * `claudeSessionId` (the same key the Agent tab uses).
 */
export type WorkflowPayload = { claudeSessionId: string | null };

/** A panel tab — discriminated by `kind`, so `payload` is narrowed per kind. */
export type PanelTab =
  | { id: string; kind: typeof PanelTabKind.Table; title: string; payload: TablePayload }
  | { id: string; kind: typeof PanelTabKind.Code; title: string; payload: CodePayload }
  | { id: string; kind: typeof PanelTabKind.Text; title: string; payload: TextPayload }
  | { id: string; kind: typeof PanelTabKind.Agent; title: string; payload: AgentPayload }
  | { id: string; kind: typeof PanelTabKind.Workflow; title: string; payload: WorkflowPayload };

/** Payload type for a given tab kind — single source for kind→payload mapping. */
export type PayloadByKind = {
  [PanelTabKind.Table]: TablePayload;
  [PanelTabKind.Code]: CodePayload;
  [PanelTabKind.Text]: TextPayload;
  [PanelTabKind.Agent]: AgentPayload;
  [PanelTabKind.Workflow]: WorkflowPayload;
};

/**
 * A patch for `updateTab`. `title` is always allowed; a `payload` patch is
 * tagged with its `kind` so the type cannot supply, say, a TextPayload — the
 * payload must declare which kind it belongs to. `updateTab` then refuses to
 * apply a payload whose kind differs from the target tab (runtime guard), so
 * a tab can never become structurally corrupt (e.g. table kind + text payload).
 */
export type TabPatch =
  | { title?: string; kind?: undefined; payload?: undefined }
  | { title?: string; kind: typeof PanelTabKind.Table; payload: TablePayload }
  | { title?: string; kind: typeof PanelTabKind.Code; payload: CodePayload }
  | { title?: string; kind: typeof PanelTabKind.Text; payload: TextPayload };

/** Panel width clamp bounds (px floor; ceiling is 90% of the viewport). */
export const MIN_PANEL_WIDTH = 320;
const DEFAULT_PANEL_WIDTH = 480;

/** Live ceiling for the panel width: 90% of the current viewport. */
export function maxPanelWidth(): number {
  return Math.round(window.innerWidth * 0.9);
}

type PanelState = {
  isOpen: boolean;
  tabs: PanelTab[];
  activeTabId: string | null;
  /** Persisted panel width in px; survives close/reopen via the store. */
  width: number;
  /** Set the panel width, clamped to [320, 0.9 * window.innerWidth]. */
  setWidth: (px: number) => void;
  /** Push a tab (or refocus if its id already exists) and open the panel. */
  openTab: (tab: PanelTab) => void;
  closeTab: (id: string) => void;
  /**
   * Patch an existing tab in place (e.g. ephemeral table edits). No-op if the
   * tab is absent. A `payload` patch must carry the matching `kind`; a payload
   * tagged for a different kind than the target tab is rejected (the tab is
   * left untouched) so cross-kind payload substitution is impossible.
   */
  updateTab: (id: string, patch: TabPatch) => void;
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
  width: DEFAULT_PANEL_WIDTH,
  setWidth: (px) => set({ width: clampWidth(px) }),
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
      tabs: s.tabs.map((t) => (t.id === id ? applyPatch(t, patch) : t)),
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

/**
 * Merge a {@link TabPatch} into a tab, preserving the kind invariant. `title` is
 * applied unconditionally; a `payload` is applied ONLY when the patch's `kind`
 * matches the tab's `kind`, so the two narrow together and TypeScript proves the
 * payload type is correct without a cast. A payload tagged for another kind is
 * silently dropped (the rest of the patch still applies) — a tab can never end up
 * with `kind: 'table'` carrying a `TextPayload`.
 */
function applyPatch(tab: PanelTab, patch: TabPatch): PanelTab {
  const title = patch.title ?? tab.title;
  if (patch.kind !== undefined && patch.kind === tab.kind) {
    // patch.kind === tab.kind narrows both discriminants: payload matches tab.
    if (tab.kind === PanelTabKind.Table && patch.kind === PanelTabKind.Table) {
      return { ...tab, title, payload: patch.payload };
    }
    if (tab.kind === PanelTabKind.Code && patch.kind === PanelTabKind.Code) {
      return { ...tab, title, payload: patch.payload };
    }
    if (tab.kind === PanelTabKind.Text && patch.kind === PanelTabKind.Text) {
      return { ...tab, title, payload: patch.payload };
    }
  }
  return { ...tab, title };
}

/** Clamp a requested panel width to the [320, 90% viewport] range. */
function clampWidth(px: number): number {
  return Math.min(Math.max(px, MIN_PANEL_WIDTH), maxPanelWidth());
}

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

/**
 * Stable id for a live agent tab. Identity is the (agent, conversation) pair, not
 * content — re-clicking the same agent's presence tab must refocus the SAME panel
 * tab while its live activity keeps updating. The session is hashed so distinct
 * conversations of the same-named agent get distinct tabs.
 */
export function agentTabId(agentName: string, claudeSessionId: string | null): string {
  return `agent:${contentHash(`${agentName}::${claudeSessionId ?? ''}`)}`;
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
