import { ArrowLeft } from 'lucide-react';

export type BreadcrumbProps = {
  onBack: () => void;
};

/**
 * The agent-config topbar breadcrumb: Library / Agents. "Library" is the back
 * affordance (returns to the project view); "Agents" is the current section.
 */
export function Breadcrumb({ onBack }: BreadcrumbProps) {
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5"
      style={{ background: 'var(--color-surface-1)' }}
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft size={14} />
        Library
      </button>
      <span className="text-border-strong">/</span>
      <span className="text-[13px] text-fg-subtle">Agents</span>
    </div>
  );
}
