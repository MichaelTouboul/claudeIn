export type LogoProps = {
  size?: number;
};

export function Logo({ size = 18 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="6 7 11 12 6 17" />
      <line x1="13" y1="17" x2="19" y2="17" />
    </svg>
  );
}
