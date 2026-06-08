import type { TableColumn, TablePayload, TableRow } from '@/store/usePanelStore';

/**
 * Pure parser: a raw GitHub-Flavored-Markdown table STRING → DataGrid columns +
 * rows. The chat-side `parseTable.ts` walks a react-markdown hast node; the panel
 * transform instead gets back a markdown string from `claude --print`, so this
 * parses the text form directly. Both produce the same `{ columns, rows }` shape.
 *
 * Robust to the surrounding noise an LLM may emit: leading/trailing prose lines
 * and ```` ```markdown ```` fences are stripped; only the contiguous run of
 * pipe-rows that contains a dash separator is treated as the table.
 *
 * Returns `null` when no table is found, so the caller can keep the existing tab
 * content rather than blanking it on a malformed response.
 */
export function parseMarkdownTable(markdown: string): TablePayload | null {
  const lines = markdown
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'));

  // Need at least a header row + a separator row.
  const sepIndex = lines.findIndex((l) => isSeparatorRow(l));
  if (sepIndex < 1) return null;

  const headerCells = splitRow(lines[sepIndex - 1]);
  if (headerCells.length === 0) return null;

  // Slugs must be unique: DataGrid forbids duplicate `field`s, and the row-builder
  // keys by `field`, so a collision would silently overwrite a column's cells.
  const usedFields = new Set<string>();
  const columns: TableColumn[] = headerCells.map((headerName, i) => ({
    field: dedupeField(slug(headerName, i), usedFields),
    headerName,
  }));

  const bodyLines = lines.slice(sepIndex + 1).filter((l) => !isSeparatorRow(l));
  const rows: TableRow[] = bodyLines.map((line, rowIndex) => {
    const cells = splitRow(line);
    const values: Record<string, string> = {};
    columns.forEach((col, colIndex) => {
      values[col.field] = cells[colIndex] ?? '';
    });
    return { id: rowIndex, ...values };
  });

  return { columns, rows };
}

/** A GFM separator row is all dashes/colons/pipes/spaces (`|---|:--:|`). */
function isSeparatorRow(line: string): boolean {
  const inner = line.replace(/^\||\|$/g, '');
  return /^[\s:|-]+$/.test(inner) && inner.includes('-');
}

/** Split a `| a | b |` row into trimmed cell strings (drops the outer pipes). */
function splitRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}

/** Slugify header text into a safe object key for the column `field`. */
function slug(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base.length > 0 ? base : `col_${index}`;
}

/**
 * Make `field` unique within `used`, appending `_2`, `_3`, … on collision. The
 * suffix is skipped if it would itself collide, so duplicates never alias. Mutates
 * `used` to record the returned field.
 */
function dedupeField(field: string, used: Set<string>): string {
  if (!used.has(field)) {
    used.add(field);
    return field;
  }
  let suffix = 2;
  let candidate = `${field}_${suffix}`;
  while (used.has(candidate)) {
    suffix += 1;
    candidate = `${field}_${suffix}`;
  }
  used.add(candidate);
  return candidate;
}
