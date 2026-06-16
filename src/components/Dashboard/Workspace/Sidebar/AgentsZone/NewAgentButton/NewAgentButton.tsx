import { Plus } from 'lucide-react';

export type NewAgentButtonProps = {
  onClick: () => void;
};

/** Footer affordance that starts the create-agent flow. */
export function NewAgentButton({ onClick }: NewAgentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-1.5 px-4 py-2.5 text-xs cursor-pointer"
      style={{ borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
    >
      <Plus size={14} />
      New agent
    </button>
  );
}
