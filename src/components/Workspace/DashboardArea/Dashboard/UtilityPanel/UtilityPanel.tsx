import { X } from 'lucide-react';

import { Dialog } from '@/components/_ui/Dialog';
import { type TabItem, Tabs } from '@/components/_ui/Tabs';
import { usePanelStore } from '@/store/usePanelStore';

import { TAB_BODY } from './panelTabBody';

export function UtilityPanel() {
  const isOpen = usePanelStore((s) => s.isOpen);
  const tabs = usePanelStore((s) => s.tabs);
  const activeTabId = usePanelStore((s) => s.activeTabId);
  const setActive = usePanelStore((s) => s.setActive);
  const closeTab = usePanelStore((s) => s.closeTab);
  const setOpen = usePanelStore((s) => s.setOpen);

  const active = tabs.find((t) => t.id === activeTabId) ?? null;
  const Body = active ? TAB_BODY[active.kind] : null;
  const tabItems: TabItem[] = tabs.map((t) => ({
    key: t.id,
    label: t.title,
    onClose: () => closeTab(t.id),
  }));

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) setOpen(false);
      }}
      variant="drawer-right"
      title="Panel"
    >
      <div
        className="relative h-full flex flex-col w-[480px] max-w-[90%]"
        style={{
          background: 'var(--color-surface-1)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className="flex items-center justify-between pr-2"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <Tabs tabs={tabItems} active={activeTabId ?? ''} onChange={setActive} className="flex-1" />
          <button
            onClick={() => setOpen(false)}
            title="Close"
            aria-label="Close panel"
            className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {active && Body ? (
            <Body tab={active} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                Open a table from a response to start.
              </p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
