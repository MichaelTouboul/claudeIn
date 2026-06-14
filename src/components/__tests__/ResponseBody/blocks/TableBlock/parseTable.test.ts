import { describe, expect, it } from 'vitest';

import { type HastNode, parseTableNode } from '@/components/ResponseBody/blocks/TableBlock/parseTable';

/** Build a hast cell element wrapping a single text node. */
function cell(tag: 'th' | 'td', text: string): HastNode {
  return { type: 'element', tagName: tag, children: [{ type: 'text', value: text }] };
}

function row(tag: 'th' | 'td', texts: string[]): HastNode {
  return { type: 'element', tagName: 'tr', children: texts.map((t) => cell(tag, t)) };
}

/** Minimal hand-built hast `table` node: 2 columns, 2 rows. */
const tableNode: HastNode = {
  type: 'element',
  tagName: 'table',
  children: [
    { type: 'element', tagName: 'thead', children: [row('th', ['First Name', 'Age'])] },
    {
      type: 'element',
      tagName: 'tbody',
      children: [row('td', ['Ada', '36']), row('td', ['Alan', '41'])],
    },
  ],
};

describe('parseTableNode', () => {
  it('derives columns from thead th cells, slugifying the header text into field', () => {
    const { columns } = parseTableNode(tableNode);
    expect(columns).toEqual([
      { field: 'first_name', headerName: 'First Name' },
      { field: 'age', headerName: 'Age' },
    ]);
  });

  it('maps each tbody tr to a row keyed by column field with a numeric id', () => {
    const { rows } = parseTableNode(tableNode);
    expect(rows).toEqual([
      { id: 0, first_name: 'Ada', age: '36' },
      { id: 1, first_name: 'Alan', age: '41' },
    ]);
  });

  it('concatenates nested descendant text nodes for a cell', () => {
    const nested: HastNode = {
      type: 'element',
      tagName: 'table',
      children: [
        { type: 'element', tagName: 'thead', children: [row('th', ['Label'])] },
        {
          type: 'element',
          tagName: 'tbody',
          children: [
            {
              type: 'element',
              tagName: 'tr',
              children: [
                {
                  type: 'element',
                  tagName: 'td',
                  children: [
                    { type: 'text', value: 'bold ' },
                    {
                      type: 'element',
                      tagName: 'strong',
                      children: [{ type: 'text', value: 'value' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(parseTableNode(nested).rows).toEqual([{ id: 0, label: 'bold value' }]);
  });

  it('falls back to a positional field when a header is empty', () => {
    const empty: HastNode = {
      type: 'element',
      tagName: 'table',
      children: [
        { type: 'element', tagName: 'thead', children: [row('th', ['', 'Name'])] },
        { type: 'element', tagName: 'tbody', children: [row('td', ['x', 'y'])] },
      ],
    };
    const { columns, rows } = parseTableNode(empty);
    expect(columns[0].field).toBe('col_0');
    expect(rows[0]).toEqual({ id: 0, col_0: 'x', name: 'y' });
  });
});
