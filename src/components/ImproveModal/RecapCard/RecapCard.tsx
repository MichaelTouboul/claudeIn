import { Check, ListChecks } from 'lucide-react';

import { Inline } from '@/components/_ui/Inline';
import { Stack } from '@/components/_ui/Stack';

import type { ParsedRecap } from '../recap';

type RecapCardProps = {
  recap: ParsedRecap;
};

/**
 * Renders a parsed recap (TITLE / DESCRIPTION / ACCEPTANCE) as a clean,
 * bordered card — replacing the raw ```recap fence the assistant emits.
 */
export function RecapCard({ recap }: RecapCardProps) {
  return (
    <Stack
      gap={3}
      className="mt-2 rounded-lg px-4 py-3"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border-strong)',
      }}
    >
      <h4
        className="text-sm font-semibold leading-snug"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {recap.title}
      </h4>

      {recap.description ? (
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {recap.description}
        </p>
      ) : null}

      {recap.acceptance.length > 0 ? (
        <Stack gap={2}>
          <Inline
            gap={1.5}
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ListChecks size={13} />
            Acceptance
          </Inline>
          <Stack as="ul" gap={1.5} className="list-none">
            {recap.acceptance.map((item) => (
              <Inline as="li" key={item} gap={2} align="start" className="text-sm">
                <Check
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: 'var(--color-active)' }}
                />
                <span style={{ color: 'var(--color-text-primary)' }}>{item}</span>
              </Inline>
            ))}
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
