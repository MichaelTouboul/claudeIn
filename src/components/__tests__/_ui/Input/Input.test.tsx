import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from '@/components/_ui/Input';

describe('Input', () => {
  it('defaults to the filled md sans field chrome', () => {
    render(<Input placeholder="name" />);
    const el = screen.getByPlaceholderText('name');
    expect(el).toHaveClass('text-sm', 'font-sans', 'border', 'bg-surface-2');
  });

  it('applies the sm + mono + bare variants', () => {
    render(<Input placeholder="bare" size="sm" font="mono" variant="bare" />);
    const el = screen.getByPlaceholderText('bare');
    expect(el).toHaveClass('text-xs', 'font-mono', 'bg-transparent', 'border-0');
    expect(el).not.toHaveClass('border', 'bg-surface-2');
  });

  it('forwards native input props', () => {
    render(<Input placeholder="p" disabled value="x" readOnly />);
    expect(screen.getByPlaceholderText('p')).toBeDisabled();
  });
});
