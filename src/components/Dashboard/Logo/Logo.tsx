export type LogoProps = {
  size?: number;
};

export function Logo({ size = 18 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 8.5 L17 16 L9 23.5" />
      <path d="M20.5 23.5 L25 23.5" />
    </svg>
  );
}
