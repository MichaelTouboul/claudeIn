import type { ReactNode } from 'react';

export type SectionLabelProps = {
  icon: ReactNode;
  label: string;
};

export function SectionLabel({ icon, label }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 mt-1 first:mt-0">
      {icon}
      <span
        className="text-2xs font-semibold text-fg-muted uppercase"
        style={{ letterSpacing: 'var(--tracking-caps)' }}
      >
        {label}
      </span>
    </div>
  );
}
