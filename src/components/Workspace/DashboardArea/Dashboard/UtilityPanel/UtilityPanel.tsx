import { X } from 'lucide-react';
import { useCallback, useEffect, useReducer, useRef } from 'react';

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

  // Re-clamp the stored width and refresh the rendered ceiling when the viewport
  // changes, so the separator never advertises a stale aria-valuemax and the
  // width never exceeds the new viewport bound.
  const [, refreshMax] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const onResize = () => {
      setWidth(usePanelStore.getState().width);
      refreshMax();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setWidth]);

  // Drag-to-resize from the LEFT edge (panel is docked right, so width is the
  // distance from the cursor to the right viewport edge). Listeners live ONLY
  // while a drag is in progress — attached in startDrag, removed in endDrag —
  // mirroring useResizableSidebar and avoiding zombie document listeners (this
  // component is always mounted, so an always-on listener would never be torn
  // down). The store action clamps the value.
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      setWidth(window.innerWidth - e.clientX);
    },
    [setWidth],
  );
  const endDrag = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', endDrag);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [onMouseMove]);
  const startDrag = useCallback(() => {
    isDragging.current = true;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', endDrag);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [onMouseMove, endDrag]);

  // Reset drag state if the panel closes mid-drag; tear down on unmount.
  useEffect(() => {
    if (!isOpen) endDrag();
  }, [isOpen, endDrag]);
  useEffect(() => endDrag, [endDrag]);

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
