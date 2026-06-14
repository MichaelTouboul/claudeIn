import { create } from 'zustand';

import type { TableColumn, TableRow } from '@/components/ResponseBody/blocks/TableBlock/parseTable';
import { contentHash } from '@/lib/utils';

export type { TableColumn, TableRow };

/** Finite set of panel object kinds. Add a value here + an entry in TAB_BODY to extend the panel. */
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
 * snapshot into the object: the body reads live status/tool/context/events from
 * `useEventsStore` keyed by `agentName` (+ `claudeSessionId` to scope the stream).
 */
export type AgentPayload = { agentName: string; claudeSessionId: string | null };
/**
 * A live session-overview view. Like {@link AgentPayload} it carries no snapshot —
 * the body reads live status/tool/events from `useEventsStore`, scoped by
 * `claudeSessionId` (the same key the Agent view uses).
 */
export type WorkflowPayload = { claudeSessionId: string | null };

/**
 * A panel object — discriminated by `kind`, so `payload` is narrowed per kind.
 * The panel holds at most ONE of these at a time (single-object model). The
 * `id` is a stable identity a renderer can key live reads off of (e.g. TableTab
 * reads the live payload from `current` and matches it by `id`).
 */
export type PanelTab =
  | { id: string; kind: typeof PanelTabKind.Table; title: string; payload: TablePayload }
  | { id: string; kind: typeof PanelTabKind.Code; title: string; payload: CodePayload }
  | { id: string; kind: typeof PanelTabKind.Text; title: string; payload: TextPayload }
  | { id: string; kind: typeof PanelTabKind.Agent; title: string; payload: AgentPayload }
  | { id: string; kind: typeof PanelTabKind.Workflow; title: string; payload: WorkflowPayload };

/** Payload type for a given object kind — single source for kind→payload mapping. */
export type PayloadByKind = {
  [PanelTabKind.Table]: TablePayload;
  [PanelTabKind.Code]: CodePayload;
  [PanelTabKind.Text]: TextPayload;
  [PanelTabKind.Agent]: AgentPayload;
  [PanelTabKind.Workflow]: WorkflowPayload;
};

/**
 * A patch for `update`. `title` is always allowed; a `payload` patch is tagged
 * with its `kind` so the type cannot supply, say, a TextPayload to a Code object.
 * `update` refuses to apply a payload whose kind differs from the current object
 * (runtime guard), so the object can never become structurally corrupt (e.g.
 * table kind + text payload).
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
  /** The single object currently displayed, or null when the panel is empty. */
  current: PanelTab | null;
  /** Persisted panel width in px; survives close/reopen via the store. */
  width: number;
  /** Set the panel width, clamped to [320, 0.9 * window.innerWidth]. */
  setWidth: (px: number) => void;
  /** Show an object, REPLACING whatever was there, and open the panel. */
  open: (object: PanelTab) => void;
  /** Close the panel (keeps `current` so reopen shows the last object). */
  close: () => void;
  /**
   * Patch the current object in place (e.g. ephemeral table/code/text edits).
   * No-op if the panel is empty. A `payload` patch must carry the matching
   * `kind`; a payload tagged for a different kind than `current` is rejected
   * (the object is left untouched) so cross-kind payload substitution is
   * impossible.
   */
  update: (patch: TabPatch) => void;
  /**
   * Replace a single row (matched by `id`) in the current table object's
   * payload, reading the LIVE state inside the set updater so back-to-back edits
   * never lose data (no stale render-time closure). No-op if the panel is empty
   * or `current` is not a table.
   */
  commitRow: (row: TableRow) => void;
  setOpen: (open: boolean) => void;
  togglePanel: () => void;
};

export const usePanelStore = create<PanelState>((set) => ({
  isOpen: false,
  current: null,
  width: DEFAULT_PANEL_WIDTH,
  setWidth: (px) => set({ width: clampWidth(px) }),
  open: (object) => set({ isOpen: true, current: object }),
  close: () => set({ isOpen: false }),
  update: (patch) =>
    set((s) => (s.current ? { current: applyPatch(s.current, patch) } : {})),
  commitRow: (row) =>
    set((s) => {
      const c = s.current;
      if (!c || c.kind !== PanelTabKind.Table) return {};
      const rows = c.payload.rows.map((r) => (r.id === row.id ? row : r));
      return { current: { ...c, payload: { ...c.payload, rows } } };
    }),
  setOpen: (open) => set({ isOpen: open }),
  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
}));

/**
 * Merge a {@link TabPatch} into an object, preserving the kind invariant. `title`
 * is applied unconditionally; a `payload` is applied ONLY when the patch's `kind`
 * matches the object's `kind`, so the two narrow together and TypeScript proves
 * the payload type is correct without a cast. A payload tagged for another kind is
 * silently dropped (the rest of the patch still applies) — an object can never end
 * up with `kind: 'table'` carrying a `TextPayload`.
 */
function applyPatch(object: PanelTab, patch: TabPatch): PanelTab {
  const title = patch.title ?? object.title;
  if (patch.kind !== undefined && patch.kind === object.kind) {
    // patch.kind === object.kind narrows both discriminants: payload matches.
    if (object.kind === PanelTabKind.Table && patch.kind === PanelTabKind.Table) {
      return { ...object, title, payload: patch.payload };
    }
    if (object.kind === PanelTabKind.Code && patch.kind === PanelTabKind.Code) {
      return { ...object, title, payload: patch.payload };
    }
    if (object.kind === PanelTabKind.Text && patch.kind === PanelTabKind.Text) {
      return { ...object, title, payload: patch.payload };
    }
  }
  return { ...object, title };
}

/** Clamp a requested panel width to the [320, 90% viewport] range. */
function clampWidth(px: number): number {
  return Math.min(Math.max(px, MIN_PANEL_WIDTH), maxPanelWidth());
}

/**
 * Content-derived object id (djb2 hash) so re-opening the *same* content reuses
 * a stable identity (handy for live reads keyed by `id`). The hash is only a
 * fast identity hint, not a guarantee of uniqueness; the single-object model
 * replaces `current` on every `open`, so collisions are harmless.
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
 * Stable id for a live agent object. Identity is the (agent, conversation) pair,
 * not content — re-opening the same agent's presence view reuses the SAME id
 * while its live activity keeps updating. The session is hashed so distinct
 * conversations of the same-named agent get distinct ids.
 */
export function agentTabId(agentName: string, claudeSessionId: string | null): string {
  return `agent:${contentHash(`${agentName}::${claudeSessionId ?? ''}`)}`;
}

/**
 * Stable id for a session's overview (Workflow) object. Identity is the
 * conversation itself, not content. Distinct conversations get distinct ids; a
 * null session shares one "unscoped" overview id.
 */
export function workflowTabId(claudeSessionId: string | null): string {
  return `workflow:${contentHash(claudeSessionId ?? '')}`;
}
