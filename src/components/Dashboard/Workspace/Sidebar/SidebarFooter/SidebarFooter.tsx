import { Plus } from 'lucide-react';

export type SidebarFooterProps = {
  onInstallPlugin: () => void;
};

/**
 * The sidebar footer affordance — always "Install from plugin", shown in both
 * the Sessions and Library views (the affordance no longer varies by view).
 */
export function SidebarFooter({ onInstallPlugin }: SidebarFooterProps) {
  return (
    <button
      type="button"
      onClick={onInstallPlugin}
      className="flex w-full items-center gap-1.5 px-4 py-2.5 text-xs cursor-pointer shrink-0"
      style={{ borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
    >
      <Plus size={14} />
      Install from plugin
    </button>
  );
}
