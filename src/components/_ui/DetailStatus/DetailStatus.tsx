export type DetailStatusProps = {
  message: string;
};

/** Centered status message for detail views (loading / not-found states). */
export function DetailStatus({ message }: DetailStatusProps) {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <p
        className="text-sm"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
      >
        {message}
      </p>
    </div>
  );
}
