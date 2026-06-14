import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusDot } from '@/components/_ui/StatusDot';

describe('StatusDot', () => {
  it('applies the size variant classes', () => {
    const { container } = render(<StatusDot size="xs" data-testid="dot" />);
    const dot = container.firstElementChild;
    expect(dot).toHaveClass('w-1.5', 'h-1.5', 'rounded-full');
  });

  it('adds the pulse animation only when pulse is set', () => {
    const { container: pulsing } = render(<StatusDot pulse />);
    expect(pulsing.firstElementChild).toHaveClass('animate-pulse');
    const { container: still } = render(<StatusDot />);
    expect(still.firstElementChild).not.toHaveClass('animate-pulse');
  });

  it('passes color through via style without deriving it', () => {
    const { container } = render(<StatusDot style={{ background: 'rgb(1, 2, 3)' }} />);
    expect(container.firstElementChild).toHaveStyle({ background: 'rgb(1, 2, 3)' });
  });
});
