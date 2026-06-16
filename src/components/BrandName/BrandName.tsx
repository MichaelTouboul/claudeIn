type BrandNameProps = {
  /** Classes for the wrapper (font size/weight/tracking + the base "Claude" color). */
  className?: string;
};

/**
 * The "ClaudeIn" wordmark as text: "Claude" inherits the surrounding text color,
 * "In" is the accent (`--color-accent-text`) — the brand's two-tone name treatment.
 * Used wherever the app name is shown as a brand lockup (topbars, the welcome title),
 * never in flowing body copy. Screen readers read the two spans as one word, "ClaudeIn".
 */
export function BrandName({ className }: BrandNameProps) {
  return (
    <span className={className}>
      Claude
      <span style={{ color: "var(--color-accent-text)" }}>In</span>
    </span>
  );
}
