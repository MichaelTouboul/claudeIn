/**
 * Pure parser: a react-markdown (hast) `table` element node → DataGrid columns + rows.
 *
 * react-markdown v10 passes block overrides a `node` prop — a hast element. For a
 * GFM table that tree is:
 *   table > thead > tr > th(...)   (column headers)
 *         > tbody > tr > td(...)   (one row each)
 * We slugify each header's text into a stable `field`, then map every body cell
 * to the field of the column in the same position.
 */

/** Minimal structural shape of a hast node we care about (text or element). */
export type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  children?: HastNode[];
};

export type TableColumn = { field: string; headerName: string };
/** DataGrid row: a numeric `id` plus string cell values keyed by column field. */
export type TableRow = { id: number; [field: string]: number | string };
export type ParsedTable = { columns: TableColumn[]; rows: TableRow[] };

/** Concatenate every descendant text node's value (depth-first). */
function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
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

/** Find the first direct/indirect child element with the given tagName. */
function findTag(node: HastNode, tagName: string): HastNode | undefined {
  for (const child of node.children ?? []) {
    if (child.type === 'element' && child.tagName === tagName) return child;
  }
  return undefined;
}

/** All direct child elements with the given tagName. */
function childrenOfTag(node: HastNode | undefined, tagName: string): HastNode[] {
  if (!node) return [];
  return (node.children ?? []).filter((c) => c.type === 'element' && c.tagName === tagName);
}

export function parseTableNode(node: HastNode): ParsedTable {
  const thead = findTag(node, 'thead');
  const headerRow = childrenOfTag(thead, 'tr')[0];
  const headerCells = childrenOfTag(headerRow, 'th');

  const columns: TableColumn[] = headerCells.map((cell, i) => {
    const headerName = textOf(cell).trim();
    return { field: slug(headerName, i), headerName };
  });

  const tbody = findTag(node, 'tbody');
  const bodyRows = childrenOfTag(tbody, 'tr');

  const rows: TableRow[] = bodyRows.map((tr, rowIndex) => {
    const cells = childrenOfTag(tr, 'td');
    const values: Record<string, string> = {};
    columns.forEach((col, colIndex) => {
      values[col.field] = cells[colIndex] ? textOf(cells[colIndex]).trim() : '';
    });
    return { id: rowIndex, ...values };
  });

  return { columns, rows };
}
