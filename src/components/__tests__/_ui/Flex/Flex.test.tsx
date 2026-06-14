import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Flex } from '@/components/_ui/Flex';
import { Grid } from '@/components/_ui/Grid';
import { Inline } from '@/components/_ui/Inline';
import { Stack } from '@/components/_ui/Stack';

describe('Flex', () => {
  it('renders a flex div with the variant classes', () => {
    const { container } = render(<Flex direction="row" align="center" justify="between" />);
    const el = container.firstElementChild;
    expect(el?.tagName).toBe('DIV');
    expect(el).toHaveClass('flex', 'flex-row', 'items-center', 'justify-between');
  });

  it('maps half-step gaps to the matching Tailwind utility', () => {
    expect(render(<Flex gap={0.5} />).container.firstElementChild).toHaveClass('gap-0.5');
    expect(render(<Flex gap={1.5} />).container.firstElementChild).toHaveClass('gap-1.5');
    expect(render(<Flex gap={2.5} />).container.firstElementChild).toHaveClass('gap-2.5');
  });

  it('renders the polymorphic element from `as` and forwards its native props', () => {
    const { container } = render(
      <Flex as="form" noValidate>
        <input />
      </Flex>,
    );
    const el = container.firstElementChild as HTMLFormElement;
    expect(el.tagName).toBe('FORM');
    expect(el.noValidate).toBe(true);
  });

  it('merges passthrough className after the variant classes', () => {
    const { container } = render(<Flex gap={2} className="mb-0.5 shrink-0" />);
    expect(container.firstElementChild).toHaveClass('flex', 'gap-2', 'mb-0.5', 'shrink-0');
  });
});

describe('Stack', () => {
  it('is a vertical flex (direction col)', () => {
    const { container } = render(<Stack gap={3} />);
    expect(container.firstElementChild).toHaveClass('flex', 'flex-col', 'gap-3');
  });

  it('supports `as` (e.g. label)', () => {
    const { container } = render(<Stack as="label" gap={1} />);
    expect(container.firstElementChild?.tagName).toBe('LABEL');
  });
});

describe('Inline', () => {
  it('is a horizontal flex centered by default', () => {
    const { container } = render(<Inline gap={2} />);
    expect(container.firstElementChild).toHaveClass('flex', 'flex-row', 'items-center', 'gap-2');
  });

  it('honors an explicit align override', () => {
    const { container } = render(<Inline gap={2} align="start" />);
    const el = container.firstElementChild;
    expect(el).toHaveClass('items-start');
    expect(el).not.toHaveClass('items-center');
  });
});

describe('Grid', () => {
  it('renders a grid with cols and gap', () => {
    const { container } = render(<Grid cols={3} gap={2.5} />);
    expect(container.firstElementChild).toHaveClass('grid', 'grid-cols-3', 'gap-2.5');
  });
});
