import { afterEach, describe, expect, it, vi } from 'vitest';
import { read, utils } from 'xlsx';

import {
  buildAoa,
  buildMarkdown,
  buildPdf,
  buildTsv,
  buildXlsxBytes,
  triggerXlsx,
} from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/TableTab/exporters';
import type { TablePayload } from '@/store/dashboard/usePanelStore';

const payload: TablePayload = {
  columns: [
    { field: 'name', headerName: 'Name' },
    { field: 'age', headerName: 'Age' },
  ],
  rows: [
    { id: 0, name: 'Alice', age: '30' },
    { id: 1, name: 'Bob', age: '25' },
  ],
};

describe('buildAoa', () => {
  it('emits a header row followed by one row per record, in column order', () => {
    expect(buildAoa(payload)).toEqual([
      ['Name', 'Age'],
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
  });

  it('fills missing cells with an empty string and ignores the id field', () => {
    const sparse: TablePayload = {
      columns: [
        { field: 'a', headerName: 'A' },
        { field: 'b', headerName: 'B' },
      ],
      rows: [{ id: 0, a: 'x' }],
    };
    expect(buildAoa(sparse)).toEqual([
      ['A', 'B'],
      ['x', ''],
    ]);
  });
});

describe('buildXlsxBytes', () => {
  it('produces a workbook that round-trips back to the original grid', () => {
    const bytes = buildXlsxBytes(payload);
    const wb = read(bytes, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const aoa = utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });
    expect(aoa).toEqual([
      ['Name', 'Age'],
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
  });
});

describe('buildPdf', () => {
  it('returns a jsPDF document carrying a non-empty PDF payload', () => {
    const doc = buildPdf(payload, 'My Table');
    const out = doc.output('arraybuffer');
    const header = new TextDecoder().decode(new Uint8Array(out).slice(0, 5));
    expect(header).toBe('%PDF-');
    expect(out.byteLength).toBeGreaterThan(0);
  });
});

describe('buildTsv', () => {
  it('joins headers and cells with tabs and rows with newlines', () => {
    expect(buildTsv(payload)).toBe('Name\tAge\nAlice\t30\nBob\t25');
  });
});

describe('buildMarkdown', () => {
  it('renders a GitHub-flavoured markdown table', () => {
    expect(buildMarkdown(payload)).toBe(
      ['| Name | Age |', '| --- | --- |', '| Alice | 30 |', '| Bob | 25 |'].join('\n'),
    );
  });
});

describe('triggerXlsx download lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('defers revokeObjectURL until after the click is queued (no sync race)', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement);

    triggerXlsx(payload, 'My Table');

    // The download has been queued, but the URL must still be alive at this point.
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    // It is revoked only on a later tick, after the browser can fetch the blob.
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');

    vi.unstubAllGlobals();
  });
});
