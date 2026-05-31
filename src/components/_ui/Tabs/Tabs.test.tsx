import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from './Tabs';

const items = [
  { key: 'chat', label: 'Chat' },
  { key: 'context', label: 'Context' },
  { key: 'task', label: 'Task' },
];

describe('Tabs', () => {
  it('renders one tab button per item and marks the active one', () => {
    render(<Tabs tabs={items} active="context" onChange={() => {}} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Context' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'false');
  });

  it('fires onChange with the tab key on click', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={items} active="chat" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Task' }));
    expect(onChange).toHaveBeenCalledWith('task');
  });

  it('moves selection with ArrowRight/ArrowLeft', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={items} active="chat" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Chat' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('context');
  });
});
