import { X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import { Dialog } from '@/components/_ui/Dialog';
import { type TabItem, Tabs } from '@/components/_ui/Tabs';
import { maxPanelWidth, MIN_PANEL_WIDTH, usePanelStore } from '@/store/usePanelStore';

import { PanelResizeHandle } from './PanelResizeHandle';
import { TAB_BODY } from './panelTabBody';

export function UtilityPanel() {
  const isOpen = usePanelStore((s) => s.isOpen);
  const tabs = usePanelStore((s) => s.tabs);
  const activeTabId = usePanelStore((s) => s.activeTabId);
  const setActive = usePanelStore((s) => s.setActive);
  const closeTab = usePanelStore((s) => s.closeTab);
  const setOpen = usePanelStore((s) => s.setOpen);
  const width = usePanelStore((s) => s.width);
  const setWidth = usePanelStore((s) => s.setWidth);

  // Drag-to-resize from the LEFT edge: the panel is docked right, so its width
  // is the distance from the cursor to the right viewport edge. Mirrors
  // useResizableSidebar (the store action clamps the value).
  const isDragging = useRef(false);
  // End any in-flight drag and restore the body styles. Used by mouseup, by the
  // unmount cleanup, and whenever the panel closes — so closing mid-drag never
  // leaves the app stuck with a col-resize cursor and text selection disabled.
  const endDrag = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setWidth(window.innerWidth - e.clientX);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', endDrag);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', endDrag);
      endDrag();
    };
  }, [setWidth, endDrag]);

  // The panel content unmounts on close, but THIS component stays mounted, so
  // the listener cleanup above doesn't run on close. Reset the drag state here
  // when the panel is no longer open.
  useEffect(() => {
    if (!isOpen) endDrag();
  }, [isOpen, endDrag]);

  const startDrag = () => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

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
        className="relative h-full flex flex-col max-w-[90%]"
        style={{
          width,
          background: 'var(--color-surface-1)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.4)',
        }}
      >
        <PanelResizeHandle
          onMouseDown={startDrag}
          width={width}
          min={MIN_PANEL_WIDTH}
          max={maxPanelWidth()}
          onResize={setWidth}
        />
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
