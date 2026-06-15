import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/components/_ui/Badge';

describe('Badge', () => {
  it('defaults to the rounded shape', () => {
    render(<Badge>x</Badge>);
    const el = screen.getByText('x');
    // skill Badge uses the --radius-sm (6px) corner, i.e. rounded-sm
    expect(el).toHaveClass('rounded-sm');
    expect(el).not.toHaveClass('rounded-full');
  });

  it('uses rounded-full for the pill shape', () => {
    render(<Badge shape="pill">y</Badge>);
    const el = screen.getByText('y');
    expect(el).toHaveClass('rounded-full');
  });

  it('keeps applying the variant colors via style', () => {
    render(
      <Badge variant="yellow" shape="pill">
        z
      </Badge>,
    );
    expect(screen.getByText('z')).toHaveStyle({ color: 'rgb(244, 213, 137)' });
  });

  it('renders a leading status dot when dot is set', () => {
    const { container } = render(
      <Badge variant="green" shape="pill" dot>
        live
      </Badge>,
    );
    // the dot is a decorative span before the label
    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).not.toBeNull();
    expect(dot).toHaveClass('rounded-full');
  });

  it('renders no dot by default', () => {
    const { container } = render(<Badge>plain</Badge>);
    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();
  });
});
