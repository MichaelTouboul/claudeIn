export type LogoProps = {
  size?: number;
};

/**
 * The ClaudeIn logo — the gradient app-icon tile (`/claudein-icon.svg`), the single
 * brand asset used everywhere (favicon, header, onboarding). Fixed brand colors on
 * purpose: the logo is stable and never changes with theme or context.
 */
export function Logo({ size = 18 }: LogoProps) {
  return (
    <img
      src="/claudein-icon.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
