import { X } from 'lucide-react';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { Flex } from '@/components/_ui/Flex';
import { maxPanelWidth, MIN_PANEL_WIDTH, usePanelStore } from '@/store/usePanelStore';

import { PanelResizeHandle } from './PanelResizeHandle';
import { TAB_BODY } from './panelTabBody';

/**
 * Inline right panel inside the Dashboard content row (NOT an overlay/portal): a
 * flex sibling of the chat that shrinks it. It shows ONE object at a time — no
 * tabs — and opening a new object replaces the current one. Renders nothing when
 * closed so the chat reclaims the full width. The left-edge drag resizes it,
 * clamped to the Dashboard width (the drag is measured from the panel's own
 * right edge, which is the Dashboard's right edge).
 */
export function UtilityPanel() {
  const isOpen = usePanelStore((s) => s.isOpen);
  const current = usePanelStore((s) => s.current);
  const close = usePanelStore((s) => s.close);
  const width = usePanelStore((s) => s.width);
  const setWidth = usePanelStore((s) => s.setWidth);

  // The panel's right edge (= the Dashboard's right edge), captured at drag
  // start so the new width is `rightEdge - cursorX` — measured against the
  // Dashboard, not the viewport, so resize stays within the Dashboard area.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRightEdge = useRef(0);
  const isDragging = useRef(false);

  // Re-clamp the stored width and refresh the rendered ceiling when the viewport
  // changes, so the separator never advertises a stale aria-valuemax and the
  // width never exceeds the new bound.
  const [, refreshMax] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const onResize = () => {
      setWidth(usePanelStore.getState().width);
      refreshMax();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setWidth]);

  // Drag-to-resize from the LEFT edge (panel is docked right, grows leftward).
  // Listeners live ONLY while a drag is in progress — attached in startDrag,
  // removed in endDrag — avoiding zombie document listeners. The store action
  // clamps the value.
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      setWidth(dragRightEdge.current - e.clientX);
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
    dragRightEdge.current = panelRef.current?.getBoundingClientRect().right ?? window.innerWidth;
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

  if (!isOpen) return null;

  const Body = current ? TAB_BODY[current.kind] : null;

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Panel"
      className="relative h-full flex flex-col shrink-0"
      style={{
        width,
        background: 'var(--color-surface-1)',
        borderLeft: '1px solid var(--color-border)',
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
        className="flex items-center justify-between gap-2 pl-3 pr-2 h-9 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span
          className="truncate text-xs font-medium"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}
        >
          {current?.title ?? ''}
        </span>
        <Flex
          as="button"
          align="center"
          justify="center"
          onClick={close}
          title="Close"
          aria-label="Close panel"
          className="w-7 h-7 rounded-md shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <X size={15} />
        </Flex>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {current && Body ? (
          <Body tab={current} />
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
  );
}
