import { describe, expect, it } from 'vitest';

import { parseMarkdownTable } from './parseMarkdownTable';

describe('parseMarkdownTable', () => {
  it('parses a clean GFM table into columns + rows', () => {
    const md = ['| Name | Age |', '| --- | --- |', '| Alice | 30 |', '| Bob | 25 |'].join('\n');
    const result = parseMarkdownTable(md);
    expect(result).not.toBeNull();
    expect(result?.columns).toEqual([
      { field: 'name', headerName: 'Name' },
      { field: 'age', headerName: 'Age' },
    ]);
    expect(result?.rows).toEqual([
      { id: 0, name: 'Alice', age: '30' },
      { id: 1, name: 'Bob', age: '25' },
    ]);
  });

  it('strips surrounding prose and code fences an LLM may add', () => {
    const md = [
      'Here is the updated table:',
      '```markdown',
      '| A | B |',
      '|:-:|:-:|',
      '| 1 | 2 |',
      '```',
      'Let me know if you need more.',
    ].join('\n');
    const result = parseMarkdownTable(md);
    expect(result?.columns.map((c) => c.headerName)).toEqual(['A', 'B']);
    expect(result?.rows).toEqual([{ id: 0, a: '1', b: '2' }]);
  });

  it('assigns row ids sequentially from zero', () => {
    const md = ['| X |', '| - |', '| a |', '| b |', '| c |'].join('\n');
    const result = parseMarkdownTable(md);
    expect(result?.rows.map((r) => r.id)).toEqual([0, 1, 2]);
  });

  it('pads missing trailing cells with empty strings', () => {
    const md = ['| A | B |', '| - | - |', '| only-a |'].join('\n');
    const result = parseMarkdownTable(md);
    expect(result?.rows[0]).toEqual({ id: 0, a: 'only-a', b: '' });
  });

  it('returns null when there is no table', () => {
    expect(parseMarkdownTable('just some prose, no table here')).toBeNull();
  });

  it('returns null when a separator row is present but no header precedes it', () => {
    expect(parseMarkdownTable('| --- | --- |\n| 1 | 2 |')).toBeNull();
  });

  it('deduplicates slug-colliding headers so no cell value is lost', () => {
    // 'Score'/'Score' (exact dup) and 'First Name'/'First-Name' (slug-equivalent)
    // both collapse to one slug; without a collision guard the second column would
    // overwrite the first for every row.
    const md = [
      '| Score | Score | First Name | First-Name |',
      '| - | - | - | - |',
      '| 10 | 20 | Ada | Lovelace |',
    ].join('\n');
    const result = parseMarkdownTable(md);
    expect(result?.columns.map((c) => c.field)).toEqual([
      'score',
      'score_2',
      'first_name',
      'first_name_2',
    ]);
    // Headers are preserved verbatim even when slugs collide.
    expect(result?.columns.map((c) => c.headerName)).toEqual([
      'Score',
      'Score',
      'First Name',
      'First-Name',
    ]);
    // Every cell survives — no silent overwrite.
    expect(result?.rows[0]).toEqual({
      id: 0,
      score: '10',
      score_2: '20',
      first_name: 'Ada',
      first_name_2: 'Lovelace',
    });
  });
});
