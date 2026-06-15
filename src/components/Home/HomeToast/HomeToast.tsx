type HomeToastProps = {
  /** Message to show, or null to render nothing. */
  message: string | null;
};

/** Transient confirmation toast, centered near the bottom of the Home surface. */
export function HomeToast({ message }: HomeToastProps) {
  if (message === null) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md border border-border px-4 py-2.5 text-[13px] text-fg"
      style={{ background: "var(--color-surface-3)", boxShadow: "var(--shadow-popover)" }}
    >
      {message}
    </div>
  );
}
