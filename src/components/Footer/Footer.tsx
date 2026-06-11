import { DevReset } from "@/components/DevReset/DevReset";

export function Footer() {
  return (
    <div
      className="shrink-0 flex items-center justify-end px-3"
      style={{ height: '22px', background: 'var(--color-surface-1)', borderTop: '1px solid var(--color-border)' }}
    >
      <DevReset />
    </div>
  );
}
