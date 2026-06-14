import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatsBar } from '@/components/Dashboard/StatsBar/StatsBar';

describe('StatsBar (minimal)', () => {
  it('shows the Live connection indicator with an accessible label when connected', () => {
    render(<StatsBar activeCount={2} connected />);
    expect(screen.getByText('Live')).not.toBeNull();
    expect(screen.getByLabelText(/connection: live/i)).not.toBeNull();
  });

  it('shows the Off indicator with an accessible label when disconnected', () => {
    render(<StatsBar activeCount={0} connected={false} />);
    expect(screen.getByText('Off')).not.toBeNull();
    expect(screen.getByLabelText(/connection: off/i)).not.toBeNull();
  });

  it('renders the active-agents count', () => {
    render(<StatsBar activeCount={5} connected />);
    expect(screen.getByLabelText(/active agents: 5/i)).not.toBeNull();
    expect(screen.getByText('5')).not.toBeNull();
  });

  it('does not render events-today or total-token stats', () => {
    render(<StatsBar activeCount={3} connected />);
    expect(screen.queryByLabelText(/events today/i)).toBeNull();
    expect(screen.queryByLabelText(/tokens/i)).toBeNull();
  });
});
