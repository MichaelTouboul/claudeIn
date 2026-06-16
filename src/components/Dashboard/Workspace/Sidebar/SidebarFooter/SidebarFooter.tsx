import { Plus } from 'lucide-react';

import { SidebarView } from '@/store/dashboard/useDashboardUIStore';

export type SidebarFooterProps = {
  view: SidebarView;
  onNewSession: () => void;
  onInstallPlugin: () => void;
};

type FooterAffordance = {
  label: string;
  handlerKey: 'onNewSession' | 'onInstallPlugin';
};

// One affordance per sidebar mode (enum → behavior map, no fallback chain):
// Sessions opens a fresh chat; Library starts the plugin-install flow.
const FOOTER_BY_VIEW: Record<SidebarView, FooterAffordance> = {
  [SidebarView.Sessions]: { label: 'New session', handlerKey: 'onNewSession' },
  [SidebarView.Library]: { label: 'Install from plugin', handlerKey: 'onInstallPlugin' },
};

/** The mode-dependent footer affordance of the sidebar switch. */
export function SidebarFooter({ view, onNewSession, onInstallPlugin }: SidebarFooterProps) {
  const affordance = FOOTER_BY_VIEW[view];
  const handlers = { onNewSession, onInstallPlugin };
  return (
    <button
      type="button"
      onClick={handlers[affordance.handlerKey]}
      className="flex w-full items-center gap-1.5 px-4 py-2.5 text-xs cursor-pointer shrink-0"
      style={{ borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
    >
      <Plus size={14} />
      {affordance.label}
    </button>
  );
}
