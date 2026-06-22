import { useEffect, useState } from 'react';

import { Input } from '@/components/_ui/Input';
import { Select } from '@/components/_ui/Select';
import { Stack } from '@/components/_ui/Stack';
import type { ImproveContextTarget } from '@/lib/types';

import {
  chainOptions,
  defaultSelectValue,
  FREE_TEXT_VALUE,
  NONE_VALUE,
  resolveTarget,
} from './componentTargetOptions';

type ComponentTargetSelectProps = {
  /** The captured target whose ancestor chain populates the picker. */
  target: ImproveContextTarget | null;
  /** Reports the resolved `{ component?, sourcePath? }` whenever it changes. */
  onChange: (resolved: Pick<ImproveContextTarget, 'component' | 'sourcePath'>) => void;
  disabled?: boolean;
};

/**
 * "Target component" picker: pick which component in the click's ancestor chain
 * the request targets, instead of being stuck with the innermost `_ui/`
 * primitive. Defaults to the smart pick (first non-`_ui/` entry). Adds two
 * escape hatches — a free-text component name and "None / I'll describe" — so the
 * user is never forced into a wrong value. The resolved target is reported up via
 * `onChange`; the modal submits it as the existing `component`/`sourcePath`.
 */
export function ComponentTargetSelect({ target, onChange, disabled }: ComponentTargetSelectProps) {
  const options = chainOptions(target);
  const [selectValue, setSelectValue] = useState(() => defaultSelectValue(target));
  const [freeText, setFreeText] = useState('');

  // Re-seed when a new target is captured (the modal is reused across opens).
  useEffect(() => {
    setSelectValue(defaultSelectValue(target));
    setFreeText('');
  }, [target]);

  useEffect(() => {
    onChange(resolveTarget(target, selectValue, freeText));
  }, [target, selectValue, freeText, onChange]);

  return (
    <Stack gap={1.5} className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        Target component
      </span>
      <Select
        aria-label="Target component"
        value={selectValue}
        disabled={disabled}
        onChange={(e) => setSelectValue(e.target.value)}
        className="bg-surface-3"
      >
        {options.map((o) => (
          <option key={o.index} value={String(o.index)}>
            {o.component}
            {o.sourcePath ? ` — ${o.sourcePath}` : ''}
          </option>
        ))}
        <option value={FREE_TEXT_VALUE}>Other (enter a name)…</option>
        <option value={NONE_VALUE}>None / I'll describe</option>
      </Select>

      {selectValue === FREE_TEXT_VALUE ? (
        <Input
          aria-label="Component name"
          font="mono"
          placeholder="Component name"
          value={freeText}
          disabled={disabled}
          onChange={(e) => setFreeText(e.target.value)}
        />
      ) : null}
    </Stack>
  );
}
