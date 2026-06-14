import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { TableBlock } from '@/components/ResponseBody/blocks/TableBlock/TableBlock';
import { usePanelStore } from '@/store/dashboard/usePanelStore';

/** Minimal hast table: one header "Name", one row "Alice". */
const node = {
  type: 'element',
  tagName: 'table',
  children: [
    {
      type: 'element',
      tagName: 'thead',
      children: [
        {
          type: 'element',
          tagName: 'tr',
          children: [
            { type: 'element', tagName: 'th', children: [{ type: 'text', value: 'Name' }] },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'tbody',
      children: [
        {
          type: 'element',
          tagName: 'tr',
          children: [
            { type: 'element', tagName: 'td', children: [{ type: 'text', value: 'Alice' }] },
          ],
        },
      ],
    },
  ],
};

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, current: null });
});

describe('TableBlock Open action', () => {
  it('clicking Open shows a table object and opens the panel', () => {
    render(<TableBlock node={node} raw="" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const s = usePanelStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.current?.kind).toBe('table');
  });
});
