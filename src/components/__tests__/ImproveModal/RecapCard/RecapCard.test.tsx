import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ParsedRecap } from '@/components/ImproveModal/recap';
import { RecapCard } from '@/components/ImproveModal/RecapCard/RecapCard';

const recap: ParsedRecap = {
  title: 'Make the button pop',
  description: 'Increase contrast and add a subtle hover glow.',
  acceptance: ['Button uses the accent token', 'Hover state has a glow'],
};

describe('RecapCard', () => {
  it('renders the title, description and acceptance checklist', () => {
    render(<RecapCard recap={recap} />);

    expect(screen.getByText('Make the button pop')).toBeInTheDocument();
    expect(screen.getByText('Increase contrast and add a subtle hover glow.')).toBeInTheDocument();
    expect(screen.getByText('Button uses the accent token')).toBeInTheDocument();
    expect(screen.getByText('Hover state has a glow')).toBeInTheDocument();
  });

  it('renders each acceptance item as a list row (no raw "- " bullet text)', () => {
    render(<RecapCard recap={recap} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).not.toMatch(/^-\s/);
  });

  it('omits the acceptance section when acceptance is empty', () => {
    render(<RecapCard recap={{ ...recap, acceptance: [] }} />);

    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByText(/acceptance/i)).toBeNull();
  });
});
