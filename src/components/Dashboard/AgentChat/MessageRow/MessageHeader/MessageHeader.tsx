export type MessageHeaderProps = {
  /** Display name shown in the turn header (e.g. "You", "Claude"). */
  name: string;
  /** Pre-formatted HH:MM:SS timestamp. */
  time: string;
  /** Optional foreground color for the name (e.g. warning for an auth turn). */
  nameColor?: string;
};

/** The "Name · HH:MM:SS" header row for a chat turn. The time is muted and mono;
 *  it stays visible (unlike the old hover-only timestamp) to anchor each turn. */
export function MessageHeader({ name, time, nameColor }: MessageHeaderProps) {
  return (
    <div className="mb-[5px] flex items-baseline gap-2">
      <span
        className="text-[13px] font-semibold"
        style={{ color: nameColor ?? 'var(--color-text-primary)' }}
      >
        {name}
      </span>
      {time ? (
        <span className="font-mono text-[11px] text-fg-subtle">{time}</span>
      ) : null}
    </div>
  );
}
