import { Plus } from "lucide-react";

type AddRepoCardProps = {
  onAdd: () => void;
};

/** The "add repository" affordance: a dashed card that opens the folder picker. */
export function AddRepoCard({ onAdd }: AddRepoCardProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label="Add repository"
      className="flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-transparent text-fg-subtle transition-colors hover:border-accent hover:bg-[var(--color-accent-dim)] hover:text-accent focus-visible:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
    >
      <Plus size={20} aria-hidden="true" />
      <span className="text-[13px]">Add repository</span>
    </button>
  );
}
