/**
 * Status-cell rendering — VISUAL only. A status value (e.g. `done` / `🚧 WIP` /
 * `planned`) is shown as a design-system {@link Badge}; everything else renders as
 * the plain text node. The cell's underlying value is NEVER mutated, so the
 * markdown/Excel/PDF/Copy exporters keep seeing the raw string. This is shared by
 * both table surfaces (chat `TableBlock` + panel `TableTab`).
 */
import type { GridRenderCellParams } from '@mui/x-data-grid';
import { type ReactNode } from 'react';

import { Badge, type BadgeVariant } from '@/components/_ui/Badge';

/** A matched status: which badge hue to use + the raw label to display verbatim. */
export type StatusMatch = { variant: BadgeVariant; label: string };

/** Keyword → badge hue. Compared case-insensitively against the trimmed value. */
const KEYWORD_VARIANT: Record<string, BadgeVariant> = {
  done: 'green',
  fait: 'green',
  complete: 'green',
  completed: 'green',
  wip: 'yellow',
  'in progress': 'yellow',
  'en cours': 'yellow',
  doing: 'yellow',
  planned: 'gray',
  'prévu': 'gray',
  prevu: 'gray',
  todo: 'gray',
  blocked: 'red',
  failed: 'red',
};

/** Leading emoji → badge hue (the value keeps its emoji + any trailing text). */
const EMOJI_VARIANT: Record<string, BadgeVariant> = {
  '✅': 'green',
  '🚧': 'yellow',
  '📋': 'gray',
  '⛔': 'red',
  '❌': 'red',
};

/**
 * Classify a cell value as a status (→ a badge) or not (→ null). Pure: returns the
 * raw text as `label` so the badge shows exactly what export sees.
 */
export function matchStatus(value: string): StatusMatch | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const emoji = [...trimmed][0];
  if (emoji !== undefined && emoji in EMOJI_VARIANT) {
    return { variant: EMOJI_VARIANT[emoji], label: trimmed };
  }

  const variant = KEYWORD_VARIANT[trimmed.toLowerCase()];
  return variant ? { variant, label: trimmed } : null;
}

/** Render a single value: a status badge when it matches, plain text otherwise. */
export function StatusCell({ value }: { value: ReactNode }): ReactNode {
  if (typeof value !== 'string') return value;
  const status = matchStatus(value);
  if (!status) return value;
  return (
    <Badge variant={status.variant} dot>
      {status.label}
    </Badge>
  );
}

/**
 * DataGrid `renderCell` that renders a status badge (visual) while leaving the row
 * value untouched. Used by both surfaces' status columns.
 */
export function renderStatusCell(params: GridRenderCellParams): ReactNode {
  return <StatusCell value={params.value as ReactNode} />;
}

/**
 * Decide if a column should get the status renderer, from its header name. Status
 * columns are recognised by a small set of header keywords (`status` / `statut` /
 * `state` / `étape`), so only genuine status columns badge their cells.
 */
const STATUS_HEADER = /^(status|statut|state|état|etat|étape|etape)$/i;
export function isStatusColumn(headerName: string): boolean {
  return STATUS_HEADER.test(headerName.trim());
}
