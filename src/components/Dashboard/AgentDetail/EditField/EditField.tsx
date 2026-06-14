import { Input } from '@/components/_ui/Input';
import { Select } from '@/components/_ui/Select';
import { Textarea } from '@/components/_ui/Textarea';

import type { FieldDef } from '../fields';

export type EditFieldProps = {
  field: FieldDef;
  value: unknown;
  onChange: (val: unknown) => void;
};

export function EditField({ field, value, onChange }: EditFieldProps) {
  if (field.type === "dropdown") {
    return (
      <Select
        font="mono"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value || undefined)}
        aria-label={field.label}
      >
        {field.options!.map((opt) => (
          <option key={opt} value={opt}>{opt || "— inherit —"}</option>
        ))}
      </Select>
    );
  }

  if (field.type === "number") {
    return (
      <Input
        type="number"
        font="mono"
        value={value !== undefined && value !== null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        aria-label={field.label}
        placeholder="—"
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <Textarea
        font="mono"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        aria-label={field.label}
        rows={3}
        className="resize-y"
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <Select
        font="mono"
        value={value ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
        aria-label={field.label}
      >
        <option value="false">no</option>
        <option value="true">yes</option>
      </Select>
    );
  }

  const strVal = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  return (
    <Input
      type="text"
      font="mono"
      value={strVal}
      onChange={(e) => onChange(e.target.value)}
      aria-label={field.label}
      placeholder="—"
    />
  );
}
