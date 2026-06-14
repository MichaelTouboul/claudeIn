type AddRepoCardProps = {
  onAdd: () => void;
};

/** The "+ add" affordance: a dashed card that opens the folder picker. */
export function AddRepoCard({ onAdd }: AddRepoCardProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label="Add a favorite repository"
      className="flex min-h-[7rem] flex-col items-center justify-center gap-1 rounded border border-dashed border-border bg-transparent text-fg-subtle transition-colors hover:border-accent hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      <span className="text-lg leading-none" aria-hidden="true">
        +
      </span>
      <span className="text-xs" style={{ fontFamily: "var(--font-sans)" }}>
        add
      </span>
    </button>
  );
}
