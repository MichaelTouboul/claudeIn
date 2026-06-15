import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from '@/components/_ui/Input';

describe('Input', () => {
  it('defaults to the filled md sans field chrome', () => {
    render(<Input placeholder="name" />);
    const el = screen.getByPlaceholderText('name');
    // filled chrome now fills with the inset surface (skill --surface-inset) and uses the md radius
    expect(el).toHaveClass('text-sm', 'font-sans', 'border', 'rounded-md', 'bg-[var(--color-surface-inset)]');
  });

  it('applies the sm + mono + bare variants', () => {
    render(<Input placeholder="bare" size="sm" font="mono" variant="bare" />);
    const el = screen.getByPlaceholderText('bare');
    expect(el).toHaveClass('text-xs', 'font-mono', 'bg-transparent', 'border-0');
    expect(el).not.toHaveClass('border', 'bg-[var(--color-surface-inset)]');
  });

  it('forwards native input props', () => {
    render(<Input placeholder="p" disabled value="x" readOnly />);
    expect(screen.getByPlaceholderText('p')).toBeDisabled();
  });

  it('renders a leading icon and keeps the field interactive', () => {
    render(
      <Input
        placeholder="search"
        leadingIcon={<span data-testid="lead">i</span>}
        aria-label="Search"
      />,
    );
    expect(screen.getByTestId('lead')).toBeInTheDocument();
    const el = screen.getByPlaceholderText('search');
    // with an adornment the input itself goes bare; the chrome moves to the wrapper
    expect(el).toHaveClass('bg-transparent', 'border-0');
    expect(el).toHaveAttribute('aria-label', 'Search');
  });
});
