import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/components/_ui/Badge';

describe('Badge', () => {
  it('defaults to the rounded shape', () => {
    render(<Badge>x</Badge>);
    const el = screen.getByText('x');
    expect(el).toHaveClass('rounded');
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
});
