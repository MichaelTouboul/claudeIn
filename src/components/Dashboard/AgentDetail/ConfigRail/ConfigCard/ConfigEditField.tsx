import { type ReactNode } from 'react';

import { Input } from '@/components/_ui/Input';
import { Select } from '@/components/_ui/Select';
import { Switch } from '@/components/_ui/Switch';

import { type RailField, RailFieldKind } from '../../config/railFields';

export type ConfigEditFieldProps = {
  field: RailField;
  value: unknown;
  onChange: (value: unknown) => void;
};

/**
 * Renders the right inline editor for a rail field, keyed on its `kind`
 * (enum → behavior map, no fallback chain). The empty option on a select means
 * "inherit" and serializes back to `undefined`.
 */
const EDITORS: Record<RailFieldKind, (p: ConfigEditFieldProps) => ReactNode> = {
  [RailFieldKind.Select]: ({ field, value, onChange }) => (
    <Select
      font="mono"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value || undefined)}
      aria-label={field.label}
      className="w-full"
    >
      {field.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  ),
  [RailFieldKind.Number]: ({ field, value, onChange }) => (
    <Input
      type="number"
      font="mono"
      value={value !== undefined && value !== null ? String(value) : ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      aria-label={field.label}
      placeholder="—"
    />
  ),
  [RailFieldKind.Switch]: ({ field, value, onChange }) => (
    <Switch
      checked={Boolean(value)}
      onCheckedChange={(checked) => onChange(checked)}
      aria-label={field.label}
    />
  ),
};

export function ConfigEditField(props: ConfigEditFieldProps) {
  return <>{EDITORS[props.field.kind](props)}</>;
}
