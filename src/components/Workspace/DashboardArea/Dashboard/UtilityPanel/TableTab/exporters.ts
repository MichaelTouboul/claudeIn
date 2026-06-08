/**
 * Pure, deterministic exporters for a table panel tab. No LLM, no DOM side
 * effects in the builders — the `trigger*` helpers are the only impure shells
 * (they hand a finished artifact to the browser/clipboard).
 */
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { utils, write } from 'xlsx';

import type { TablePayload } from '@/store/usePanelStore';

/** Stringify one cell value (the grid stores `number | string`). */
function cell(value: number | string | undefined): string {
  return value === undefined ? '' : String(value);
}

/** Header row + one array per record, in declared column order (drops `id`). */
export function buildAoa({ columns, rows }: TablePayload): string[][] {
  const header = columns.map((c) => c.headerName);
  const body = rows.map((row) => columns.map((c) => cell(row[c.field])));
  return [header, ...body];
}

/** xlsx workbook serialized to bytes (Uint8Array) — round-trips via `read`. */
export function buildXlsxBytes(payload: TablePayload): Uint8Array {
  const sheet = utils.aoa_to_sheet(buildAoa(payload));
  const book = utils.book_new();
  utils.book_append_sheet(book, sheet, 'Sheet1');
  return write(book, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

/** A jsPDF document with the current grid laid out via jspdf-autotable. */
export function buildPdf(payload: TablePayload, title: string): jsPDF {
  const [head, ...body] = buildAoa(payload);
  const doc = new jsPDF();
  if (title.trim().length > 0) doc.text(title, 14, 16);
  autoTable(doc, { head: [head], body, startY: title.trim().length > 0 ? 22 : 14 });
  return doc;
}

/** Tab-separated values of the current grid (clipboard-friendly). */
export function buildTsv(payload: TablePayload): string {
  return buildAoa(payload)
    .map((row) => row.join('\t'))
    .join('\n');
}

/** GitHub-flavoured markdown table of the current grid. */
export function buildMarkdown(payload: TablePayload): string {
  const [header, ...body] = buildAoa(payload);
  const sep = header.map(() => '---');
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [line(header), line(sep), ...body.map(line)].join('\n');
}

/** Sanitize a tab title into a filesystem-friendly base filename. */
function safeName(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base.length > 0 ? base : 'table';
}

/** Trigger a browser download of `bytes` under `filename`. */
function downloadBytes(bytes: Uint8Array, filename: string, mime: string): void {
  // Copy into a fresh ArrayBuffer-backed view so the Blob part is a plain
  // ArrayBuffer (xlsx may hand back a SharedArrayBuffer-typed view).
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Download the current grid as an .xlsx file. */
export function triggerXlsx(payload: TablePayload, title: string): void {
  downloadBytes(
    buildXlsxBytes(payload),
    `${safeName(title)}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

/** Download the current grid as a .pdf file. */
export function triggerPdf(payload: TablePayload, title: string): void {
  buildPdf(payload, title).save(`${safeName(title)}.pdf`);
}

/** Copy the current grid to the clipboard as markdown. */
export function copyMarkdown(payload: TablePayload): Promise<void> {
  return navigator.clipboard.writeText(buildMarkdown(payload));
}
