import type { FieldDef } from '../fields';

export type EditFieldProps = {
  field: FieldDef;
  value: unknown;
  onChange: (val: unknown) => void;
};

export function EditField({ field, value, onChange }: EditFieldProps) {
  const base = "w-full rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1";
  const fieldStyle: React.CSSProperties = {
    background: 'var(--color-surface-2)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(6,182,212,0.25)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
  };

  if (field.type === "dropdown") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={base}
        style={fieldStyle}
      >
        {field.options!.map((opt) => (
          <option key={opt} value={opt}>{opt || "— inherit —"}</option>
        ))}
      </select>
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={value !== undefined && value !== null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className={base}
        style={fieldStyle}
        placeholder="—"
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={`${base} resize-y`}
        style={fieldStyle}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <select
        value={value ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
        className={base}
        style={fieldStyle}
      >
        <option value="false">no</option>
        <option value="true">yes</option>
      </select>
    );
  }

  const strVal = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  return (
    <input
      type="text"
      value={strVal}
      onChange={(e) => onChange(e.target.value)}
      className={base}
      style={fieldStyle}
      placeholder="—"
    />
  );
}
